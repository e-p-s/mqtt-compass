"""Topic tree model.

The tree mirrors the way a classic admin renders its object tree: every node is either a
*folder* (an intermediate topic level) or a *leaf* (a topic that actually carried a payload).

A leaf keeps the last known value together with the MQTT metadata of the message that
delivered it (QoS, retain flag, timestamp). Intermediate nodes only aggregate their children.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any, Iterator


@dataclass(slots=True)
class TopicValue:
    """The last value seen for one topic."""

    value: str | None
    """Decoded payload. ``None`` means an empty payload (MQTT "delete the value")."""

    kind: str = "string"
    """What the payload is: ``string``, ``number``, ``boolean``, ``null``, ``object``, ``array``.

    It is determined once, when the message arrives. The explorer uses it to know whether a
    topic has sub values that can be shown as a tree.
    """

    qos: int = 0
    retain: bool = False
    timestamp: float = field(default_factory=time.time)
    """Unix timestamp of the last message for this topic."""

    first_seen: float = field(default_factory=time.time)
    """Unix timestamp of the first message for this topic."""

    size: int = 0
    """Payload size in bytes."""

    def to_dict(self, max_value_length: int | None = None) -> dict[str, Any]:
        """Serialise the value.

        :param max_value_length: Cut the payload to this length. A browser delays a big
            answer in a background tab, and the tree of a broker with many topics is
            several megabytes. The full value can be fetched separately.
        """
        value = self.value
        truncated = False
        if max_value_length is not None and value is not None and len(value) > max_value_length:
            value = value[:max_value_length]
            truncated = True
        return {
            "value": value,
            "kind": self.kind,
            "qos": self.qos,
            "retain": self.retain,
            "timestamp": self.timestamp,
            "firstSeen": self.first_seen,
            "size": self.size,
            "truncated": truncated,
        }


@dataclass(slots=True)
class TopicNode:
    """One node of the topic tree.

    ``children`` is empty for a leaf. A node can be both: ``a/b`` may carry a value *and*
    have children (``a/b/c``).
    """

    name: str
    """The last segment of the topic. Empty for the root node."""

    path: str
    """The full topic path up to and including this node."""

    children: dict[str, "TopicNode"] = field(default_factory=dict)
    value: TopicValue | None = None
    parent: "TopicNode | None" = field(default=None, repr=False, compare=False)

    # -- tree helpers ---------------------------------------------------------------

    @property
    def is_leaf(self) -> bool:
        """A node that has seen a payload of its own."""
        return self.value is not None

    @property
    def is_folder(self) -> bool:
        """A node that only groups other topics."""
        return bool(self.children)

    def walk(self) -> Iterator["TopicNode"]:
        """Yield this node and all descendants, depth first."""
        yield self
        for child in self.children.values():
            yield from child.walk()

    def ensure_child(self, name: str, path: str | None = None) -> "TopicNode":
        """Return (and create if needed) the direct child called ``name``.

        ``path`` is the full topic of the child. It is passed in explicitly because MQTT
        allows empty levels (``a//b``), which makes the path impossible to derive from the
        parent alone.
        """
        child = self.children.get(name)
        if child is None:
            child = TopicNode(
                name=name,
                path=path if path is not None else (f"{self.path}/{name}" if self.path else name),
                parent=self,
            )
            self.children[name] = child
        return child

    def to_dict(self, max_value_length: int | None = None) -> dict[str, Any]:
        """Serialise the node (and its children) for the REST/WebSocket API.

        :param max_value_length: Cut the payload of the value to this length. A browser
            delays a big answer in a background tab, and the tree of a broker with many
            topics is several megabytes. The full value can be fetched separately.
        """
        data: dict[str, Any] = {"name": self.name, "path": self.path}
        if self.value is not None:
            # A payload with sub values is always sent complete - otherwise the sub tree
            # could not be built from it.
            length = None if self.value.kind in ("object", "array") else max_value_length
            data["value"] = self.value.to_dict(length)
        if self.children:
            data["children"] = [child.to_dict(max_value_length) for child in self.children.values()]
        return data


class TopicTree:
    """Mutable tree of MQTT topics.

    The tree is *not* thread safe. It is owned by the broker service and only ever touched
    from the paho network thread (via :meth:`apply_message`) or from the asyncio loop
    (via :meth:`snapshot` / :meth:`remove`). The paho callback is therefore forwarded into
    the event loop before the tree is mutated - see ``broker.py``.

    Beside the tree the class keeps a log of the changes. It allows a client that cannot
    hold a WebSocket open to ask for the changes since its last call instead of the whole
    tree.
    """

    #: How many changes are kept in the log.
    MAX_CHANGES = 1000

    __slots__ = ("root", "_dirty", "_version", "_changes", "_sequence")

    def __init__(self) -> None:
        self.root = TopicNode(name="", path="")
        self._dirty: set[str] = set()
        """Topics whose value changed since the last :meth:`take_dirty` call."""

        self._version = 0
        """Incremented on every mutation, lets clients detect missed updates."""

        self._changes: list[tuple[int, str, str | None, TopicValue | None]] = []
        """The log of the changes: (sequence, topic, kind, value)."""

        self._sequence = 0
        """The number of the last change."""

    # -- mutation -------------------------------------------------------------------

    def set_value(
        self,
        topic: str,
        value: str | None,
        *,
        qos: int = 0,
        retain: bool = False,
        size: int = 0,
        kind: str = "string",
        timestamp: float | None = None,
    ) -> TopicNode:
        """Store a value for ``topic`` and create the missing nodes on the way."""
        node = self.root
        segments = topic.split("/")
        for index, segment in enumerate(segments):
            # The path of a node is the topic up to and including this segment. It is built
            # from the segments and not from the parent, because empty levels are allowed.
            path = "/".join(segments[: index + 1])
            node = node.ensure_child(segment, path)

        now = timestamp if timestamp is not None else time.time()
        if node.value is None:
            node.value = TopicValue(
                value=value,
                kind=kind,
                qos=qos,
                retain=retain,
                timestamp=now,
                first_seen=now,
                size=size,
            )
        else:
            node.value.value = value
            node.value.kind = kind
            node.value.qos = qos
            # The retain flag is only set, never cleared.
            #
            # The MQTT specification requires the broker to set the flag to 0 when it
            # forwards a message to a subscriber - it is only set for the stored value that
            # a new subscription receives. A live message therefore never carries it, even
            # when the publisher used it. The topic stays retained on the broker though, so
            # the flag is kept.
            node.value.retain = retain or node.value.retain
            node.value.timestamp = now
            node.value.size = size

        self._dirty.add(topic)
        self._version += 1
        self._log_change(topic, "value", node.value)
        return node

    def remove(self, topic: str) -> bool:
        """Remove a topic (and its subtree) again. Returns ``True`` if something was removed."""
        node = self.find(topic)
        if node is None or node.parent is None:
            return False

        parent = node.parent
        if parent.path:
            parent.children.pop(node.name, None)
        else:
            # The root itself is never removed, only its children.
            parent.children.pop(node.name, None)

        self._dirty.add(topic)
        self._version += 1
        self._log_change(topic, "remove", None)
        return True

    # -- access ---------------------------------------------------------------------

    def find(self, topic: str) -> TopicNode | None:
        """Return the node for ``topic`` or ``None``."""
        node = self.root
        for segment in topic.split("/"):
            child = node.children.get(segment)
            if child is None:
                return None
            node = child
        return node

    def snapshot(self, max_value_length: int | None = None) -> dict[str, Any]:
        """Return the whole tree as a nested dictionary."""
        return {
            "version": self._version,
            "sequence": self._sequence,
            "children": [child.to_dict(max_value_length) for child in self.root.children.values()],
        }

    def value_of(self, topic: str) -> dict[str, Any] | None:
        """Return the complete value of one topic."""
        node = self.find(topic)
        if node is None or node.value is None:
            return None
        return node.value.to_dict()

    def take_dirty(self) -> set[str]:
        """Return and clear the set of topics that changed since the last call."""
        dirty = self._dirty
        self._dirty = set()
        return dirty

    def _log_change(self, topic: str, kind: str, value: TopicValue | None) -> None:
        """Write a change into the log of the changes."""
        self._sequence += 1
        self._changes.append((self._sequence, topic, kind, value))
        if len(self._changes) > self.MAX_CHANGES:
            # The log is bounded - the oldest entries are dropped.
            del self._changes[: len(self._changes) - self.MAX_CHANGES]

    @property
    def sequence(self) -> int:
        """The number of the last change."""
        return self._sequence

    def changes_since(self, sequence: int) -> list[dict[str, Any]]:
        """Return all changes that happened after ``sequence``.

        The result contains the new sequence number, so that the client can use it for the
        next call. If the log does not reach back that far, ``full`` is ``True`` and the
        client has to ask for the whole tree again.
        """
        changes = [entry for entry in self._changes if entry[0] > sequence]
        if not changes and sequence < self._sequence - len(self._changes):
            # The wanted change is older than the log - the client missed something.
            return [{"full": True, "sequence": self._sequence}]
        return [
            {
                "sequence": entry[0],
                "type": entry[2],
                "topic": entry[1],
                **({"value": entry[3].to_dict()} if entry[3] is not None else {}),
            }
            for entry in changes
        ]

    def stats(self) -> dict[str, int]:
        """Count the nodes of the tree."""
        topics = 0
        folders = 0
        for node in self.root.walk():
            if node is self.root:
                continue
            if node.is_leaf:
                topics += 1
            if node.children:
                folders += 1
        return {"topics": topics, "folders": folders}

    def all_topics(self) -> list[str]:
        """Return every topic that carries a value."""
        return [node.path for node in self.root.walk() if node.is_leaf]


def parse_payload(payload: bytes | bytearray | str | None) -> tuple[str | None, int]:
    """Decode an MQTT payload.

    Returns the decoded text and the payload size in bytes. MQTT has no notion of "no value" -
    a zero length payload deletes the value. Such a payload is represented as ``None``.
    """
    if payload is None:
        return None, 0
    if isinstance(payload, str):
        return (payload if payload != "" else None), len(payload.encode("utf-8"))
    if len(payload) == 0:
        return None, 0
    return payload.decode("utf-8", errors="replace"), len(payload)
