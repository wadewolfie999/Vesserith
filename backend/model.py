"""The complete single-user orientation contract; possibilities are never promoted."""

from datetime import date

FIELDS = ("objective", "priority", "constraints", "focus")
ITEM_FIELDS = (
    "id",
    "title",
    "area",
    "state",
    "origin",
    "scope",
    "next_action",
    "stopping_point",
    "waiting_for",
    "review_date",
    "uncertainty",
    "references",
)
OPTIONS = {
    "area": ("Thesis", "Income", "Vesserith", "Other"),
    "state": ("Considering", "Chosen", "Waiting", "Set aside", "Completed"),
    "origin": ("Requested", "Inferred", "Self-proposed"),
    "scope": ("Undecided", "Read", "Explain", "Draft", "Recommend", "Execute"),
}
SCOPE_HELP = {
    "Undecided": "Scope has not been chosen.",
    "Read": "Inspect information.",
    "Explain": "Clarify meaning.",
    "Draft": "Prepare something for review.",
    "Recommend": "Propose a choice.",
    "Execute": "Carry out the specified change. This app does not execute work.",
}


def empty():
    return dict(objective="", priority="", constraints="", focus="", items=[])


def validate(value):
    if not isinstance(value, dict) or set(value) != set(FIELDS) | {"items"}:
        raise ValueError("Invalid orientation fields.")
    for field in FIELDS:
        check_text(value[field])
    items = value["items"]
    if not isinstance(items, list) or len(items) > 500:
        raise ValueError("Use at most 500 entries.")
    ids = set()
    for item in items:
        if not isinstance(item, dict) or set(item) != set(ITEM_FIELDS):
            raise ValueError("Invalid entry fields.")
        for field in ITEM_FIELDS:
            check_text(item[field])
        if not item["id"] or item["id"] in ids or len(item["id"]) > 100:
            raise ValueError("Entry IDs must be unique.")
        ids.add(item["id"])
        if not item["title"].strip():
            raise ValueError("Each entry needs a title.")
        for field, choices in OPTIONS.items():
            if item[field] not in choices:
                raise ValueError(f"Invalid {field}.")
        if item["review_date"]:
            if (
                date.fromisoformat(item["review_date"]).isoformat()
                != item["review_date"]
            ):
                raise ValueError("Use YYYY-MM-DD for review dates.")
    if sum(i["state"] == "Chosen" for i in items) > 1:
        raise ValueError(
            "Only one next action can be chosen. Set the previous one aside first."
        )
    for item in items:
        if item["state"] == "Chosen" and (
            not item["next_action"].strip() or not item["stopping_point"].strip()
        ):
            raise ValueError(
                "A chosen action needs a concrete action and stopping point."
            )
    return value


def check_text(value):
    if not isinstance(value, str) or len(value) > 12000:
        raise ValueError("Text must be at most 12,000 characters.")
