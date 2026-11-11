"""Tests of the topic tree."""

from __future__ import annotations

import time

from mqtt_compass.tree import TopicTree, parse_payload


def test_empty_tree_has_no_children() -> None:
    tree = TopicTree()
    assert tree.snapshot()["children"] == []
    assert tree.stats() == {"topics": 0, "folders": 0}


def test_set_value_creates_the_whole_path() -> None:
    tree = TopicTree()
    tree.set_value("home/office/temperature", "21.5")

    node = tree.find("home/office/temperature")
    assert node is not None
    assert node.value is not None
    assert node.value.value == "21.5"
    assert node.path == "home/office/temperature"

    # The parents are folders without a value of their own.
    for parent in ("home", "home/office"):
        found = tree.find(parent)
        assert found is not None
        assert found.is_folder
        assert found.value is None


def test_update_keeps_the_first_seen_timestamp() -> None:
    tree = TopicTree()
    tree.set_value("a", "1", timestamp=1000.0)
    tree.set_value("a", "2", timestamp=2000.0)

    node = tree.find("a")
    assert node is not None and node.value is not None
    assert node.value.value == "2"
    assert node.value.timestamp == 2000.0
    assert node.value.first_seen == 1000.0


def test_remove_deletes_the_subtree() -> None:
    tree = TopicTree()
    tree.set_value("a/b/c", "1")
    tree.set_value("a/b/d", "2")
    tree.set_value("a/e", "3")

    assert tree.remove("a/b") is True
    assert tree.find("a/b") is None
    assert tree.find("a/b/c") is None
    assert tree.find("a/e") is not None
    assert tree.stats()["topics"] == 1


def test_remove_unknown_topic_returns_false() -> None:
    tree = TopicTree()
    assert tree.remove("nothing/here") is False


def test_remove_does_not_touch_the_root() -> None:
    tree = TopicTree()
    tree.set_value("a", "1")
    assert tree.remove("") is False
    assert tree.find("a") is not None


def test_snapshot_is_nested() -> None:
    tree = TopicTree()
    tree.set_value("a/b", "1")

    snapshot = tree.snapshot()
    assert snapshot["children"][0]["name"] == "a"
    assert snapshot["children"][0]["children"][0]["name"] == "b"
    assert snapshot["children"][0]["children"][0]["value"]["value"] == "1"


def test_dirty_topics_are_reported_once() -> None:
    tree = TopicTree()
    tree.set_value("a", "1")
    tree.set_value("b", "2")

    dirty = tree.take_dirty()
    assert dirty == {"a", "b"}
    assert tree.take_dirty() == set()


def test_version_changes_on_mutation() -> None:
    tree = TopicTree()
    before = tree.snapshot()["version"]
    tree.set_value("a", "1")
    assert tree.snapshot()["version"] > before


def test_empty_levels_are_kept() -> None:
    tree = TopicTree()
    tree.set_value("a//b", "1")
    assert tree.find("a//b") is not None


def test_all_topics_lists_only_leaves() -> None:
    tree = TopicTree()
    tree.set_value("a/b", "1")
    tree.set_value("a/c", "2")
    assert sorted(tree.all_topics()) == ["a/b", "a/c"]


def test_parse_payload_decodes_utf8() -> None:
    value, size = parse_payload("Grüße".encode("utf-8"))
    assert value == "Grüße"
    assert size == len("Grüße".encode("utf-8"))


def test_parse_payload_empty_means_no_value() -> None:
    assert parse_payload(b"") == (None, 0)
    assert parse_payload(None) == (None, 0)


def test_parse_payload_invalid_utf8_does_not_crash() -> None:
    value, size = parse_payload(b"\xff\xfe")
    assert value is not None
    assert size == 2


def test_value_metadata_is_kept() -> None:
    tree = TopicTree()
    tree.set_value("a", "x", qos=2, retain=True, size=1)
    node = tree.find("a")
    assert node is not None and node.value is not None
    assert node.value.qos == 2
    assert node.value.retain is True
    assert node.value.size == 1


def test_the_retain_flag_is_only_set_never_cleared() -> None:
    """The broker sets the flag to 0 when it forwards a message - see MQTT 3.1.1, 3.3.1-9.

    The topic stays retained on the broker, so the flag must not be cleared.
    """
    tree = TopicTree()
    tree.set_value("a", "x", retain=True)
    tree.set_value("a", "y", retain=False)

    node = tree.find("a")
    assert node is not None and node.value is not None
    assert node.value.retain is True
    assert node.value.value == "y"


def test_a_topic_that_was_never_retained_stays_unretained() -> None:
    tree = TopicTree()
    tree.set_value("a", "x", retain=False)
    tree.set_value("a", "y", retain=False)

    node = tree.find("a")
    assert node is not None and node.value is not None
    assert node.value.retain is False


def test_timestamp_defaults_to_now() -> None:
    tree = TopicTree()
    tree.set_value("a", "1")
    node = tree.find("a")
    assert node is not None and node.value is not None
    assert abs(node.value.timestamp - time.time()) < 5
