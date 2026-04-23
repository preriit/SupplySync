"""
Phase 1 legacy -> SupplySync migration utility.

Default mode is dry-run (no writes). Use --apply to persist data.

Scope:
- Reference data: body/make/surface/application/quality types, categories, sub-categories.
- Merchants and users.
- Products, images, and quantity transactions.

This script is intentionally deterministic: UUIDs for legacy entities are generated from
legacy numeric ids, so reruns are stable and easier to validate.
"""

from __future__ import annotations

import argparse
import re
import sys
import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Any

import psycopg2
from psycopg2.extras import Json, RealDictCursor


NAMESPACE = uuid.UUID("8c8cc0a4-c6b1-4f52-b5f4-1324a54dc5d5")


def stable_uuid(kind: str, legacy_id: Any) -> uuid.UUID:
    return uuid.uuid5(NAMESPACE, f"{kind}:{legacy_id}")


def slugify(value: str) -> str:
    value = (value or "").strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value or "unknown"


def as_str(value: Any, default: str = "") -> str:
    return str(value).strip() if value is not None else default


def as_bool(value: Any, default: bool = True) -> bool:
    return bool(value) if value is not None else default


def json_param(value: Any) -> Any:
    if isinstance(value, (dict, list)):
        return Json(value)
    return value


def normalize_phone(value: Any) -> str | None:
    phone = as_str(value)
    if not phone:
        return None
    # Keep original characters but normalize surrounding whitespace.
    return phone


@dataclass
class MigrationStats:
    body_types: int = 0
    make_types: int = 0
    surface_types: int = 0
    application_types: int = 0
    qualities: int = 0
    categories: int = 0
    sub_categories: int = 0
    merchants: int = 0
    users: int = 0
    products: int = 0
    images: int = 0
    transactions: int = 0


class Migrator:
    def __init__(self, source_url: str, target_url: str, apply: bool):
        self.source_conn = psycopg2.connect(source_url)
        self.target_conn = psycopg2.connect(target_url)
        self.apply = apply
        self.stats = MigrationStats()

        # Legacy numeric id -> target UUID
        self.body_map: dict[int, uuid.UUID] = {}
        self.make_map: dict[int, uuid.UUID] = {}
        self.surface_map: dict[int, uuid.UUID] = {}
        self.app_map: dict[int, uuid.UUID] = {}
        self.quality_map: dict[int, uuid.UUID] = {}
        self.category_map: dict[int, uuid.UUID] = {}
        self.subcategory_map: dict[int, uuid.UUID] = {}
        self.merchant_map: dict[int, uuid.UUID] = {}
        self.user_map: dict[int, uuid.UUID] = {}
        self.product_map: dict[int, uuid.UUID] = {}
        self.primary_user_by_merchant: dict[int, uuid.UUID] = {}

    def close(self) -> None:
        self.source_conn.close()
        self.target_conn.close()

    def fetch_source(self, query: str, params: tuple[Any, ...] | None = None) -> list[dict[str, Any]]:
        with self.source_conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params or ())
            return list(cur.fetchall())

    def fetch_target(self, query: str, params: tuple[Any, ...] | None = None) -> list[dict[str, Any]]:
        with self.target_conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params or ())
            return list(cur.fetchall())

    def fetch_one_target(self, query: str, params: tuple[Any, ...]) -> dict[str, Any] | None:
        with self.target_conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            row = cur.fetchone()
            return dict(row) if row else None

    def execute_target(self, query: str, params: tuple[Any, ...]) -> None:
        with self.target_conn.cursor() as cur:
            cur.execute(query, params)

    def target_columns(self, table_name: str) -> set[str]:
        rows = self.fetch_target(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            """,
            (table_name,),
        )
        return {row["column_name"] for row in rows}

    def commit_if_apply(self) -> None:
        if self.apply:
            self.target_conn.commit()

    def rollback(self) -> None:
        self.target_conn.rollback()

    def _upsert_named_ref(
        self,
        table: str,
        legacy_id: int,
        name: str,
        *,
        display_order: int = 0,
        is_active: bool = True,
        body_type_id: uuid.UUID | None = None,
    ) -> uuid.UUID:
        name = as_str(name)
        if not name:
            name = f"{table}_{legacy_id}"

        existing = self.fetch_one_target(
            f"SELECT id FROM {table} WHERE LOWER(name)=LOWER(%s) LIMIT 1",
            (name,),
        )
        if existing:
            return existing["id"]

        target_id = stable_uuid(table, legacy_id)
        if self.apply:
            if table == "make_types":
                self.execute_target(
                    """
                    INSERT INTO make_types (id, name, body_type_id, display_order, is_active)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                      name = EXCLUDED.name,
                      body_type_id = EXCLUDED.body_type_id,
                      display_order = EXCLUDED.display_order,
                      is_active = EXCLUDED.is_active
                    """,
                    (str(target_id), name, str(body_type_id) if body_type_id else None, display_order, is_active),
                )
            else:
                self.execute_target(
                    f"""
                    INSERT INTO {table} (id, name, display_order, is_active)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                      name = EXCLUDED.name,
                      display_order = EXCLUDED.display_order,
                      is_active = EXCLUDED.is_active
                    """,
                    (str(target_id), name, display_order, is_active),
                )
        return target_id

    def migrate_reference_data(self) -> None:
        body_rows = self.fetch_source("SELECT id, type, is_active FROM tile_bodytype ORDER BY id")
        for i, row in enumerate(body_rows, start=1):
            tid = self._upsert_named_ref(
                "body_types",
                row["id"],
                row["type"],
                display_order=i,
                is_active=as_bool(row["is_active"]),
            )
            self.body_map[row["id"]] = tid
            self.stats.body_types += 1

        app_rows = self.fetch_source("SELECT id, type, is_active FROM tile_applicationtype ORDER BY id")
        for i, row in enumerate(app_rows, start=1):
            tid = self._upsert_named_ref(
                "application_types",
                row["id"],
                row["type"],
                display_order=i,
                is_active=as_bool(row["is_active"]),
            )
            self.app_map[row["id"]] = tid
            self.stats.application_types += 1

        surface_rows = self.fetch_source("SELECT id, type, is_active FROM tile_surfacetype ORDER BY id")
        for i, row in enumerate(surface_rows, start=1):
            tid = self._upsert_named_ref(
                "surface_types",
                row["id"],
                row["type"],
                display_order=i,
                is_active=as_bool(row["is_active"]),
            )
            self.surface_map[row["id"]] = tid
            self.stats.surface_types += 1

        quality_rows = self.fetch_source("SELECT id, type, is_active FROM tile_quality ORDER BY id")
        for i, row in enumerate(quality_rows, start=1):
            tid = self._upsert_named_ref(
                "qualities",
                row["id"],
                row["type"],
                display_order=i,
                is_active=as_bool(row["is_active"]),
            )
            self.quality_map[row["id"]] = tid
            self.stats.qualities += 1

        make_rows = self.fetch_source("SELECT id, type, body_type_id, is_active FROM tile_maketype ORDER BY id")
        for i, row in enumerate(make_rows, start=1):
            body_target = self.body_map.get(row["body_type_id"])
            tid = self._upsert_named_ref(
                "make_types",
                row["id"],
                row["type"],
                display_order=i,
                is_active=as_bool(row["is_active"]),
                body_type_id=body_target,
            )
            self.make_map[row["id"]] = tid
            self.stats.make_types += 1

        # Ensure generic Tiles category exists.
        category_existing = self.fetch_one_target(
            "SELECT id FROM categories WHERE LOWER(slug)=LOWER(%s) LIMIT 1",
            ("tiles",),
        )
        if category_existing:
            tiles_category_id = category_existing["id"]
        else:
            tiles_category_id = stable_uuid("categories", "tiles")
            if self.apply:
                self.execute_target(
                    """
                    INSERT INTO categories (id, name, slug, description, display_order, is_active)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                      name = EXCLUDED.name,
                      slug = EXCLUDED.slug,
                      description = EXCLUDED.description,
                      display_order = EXCLUDED.display_order,
                      is_active = EXCLUDED.is_active
                    """,
                    (str(tiles_category_id), "Tiles", "tiles", "Legacy migrated category", 1, True),
                )
            self.stats.categories += 1

        category_rows = self.fetch_source(
            """
            SELECT id, name, height_in_inches, width_in_inches, height_in_mm, width_in_mm,
                   make_type_id, default_packing_per_box, is_active
            FROM tile_category
            ORDER BY id
            """
        )
        for row in category_rows:
            make_target = self.make_map.get(row["make_type_id"])
            if not make_target:
                continue

            size_label = f"{row['height_in_inches']}x{row['width_in_inches']}"
            make_name_row = self.fetch_source("SELECT type FROM tile_maketype WHERE id=%s", (row["make_type_id"],))
            make_name = make_name_row[0]["type"] if make_name_row else "Generic"
            sub_name = f"{size_label} {make_name}".strip()

            existing = self.fetch_one_target(
                """
                SELECT id
                FROM sub_categories
                WHERE category_id=%s AND size=%s AND make_type_id=%s
                LIMIT 1
                """,
                (str(tiles_category_id), size_label, str(make_target)),
            )
            if existing:
                sub_id = existing["id"]
            else:
                sub_id = stable_uuid("sub_categories", row["id"])
                if self.apply:
                    self.execute_target(
                        """
                        INSERT INTO sub_categories (
                          id, category_id, name, size, height_inches, width_inches, height_mm, width_mm,
                          make_type_id, default_packing_per_box, is_active
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO UPDATE SET
                          name=EXCLUDED.name,
                          size=EXCLUDED.size,
                          height_inches=EXCLUDED.height_inches,
                          width_inches=EXCLUDED.width_inches,
                          height_mm=EXCLUDED.height_mm,
                          width_mm=EXCLUDED.width_mm,
                          make_type_id=EXCLUDED.make_type_id,
                          default_packing_per_box=EXCLUDED.default_packing_per_box,
                          is_active=EXCLUDED.is_active
                        """,
                        (
                            str(sub_id),
                            str(tiles_category_id),
                            sub_name,
                            size_label,
                            row["height_in_inches"],
                            row["width_in_inches"],
                            row["height_in_mm"],
                            row["width_in_mm"],
                            str(make_target),
                            row["default_packing_per_box"] or 10,
                            as_bool(row["is_active"]),
                        ),
                    )
                self.stats.sub_categories += 1
            self.subcategory_map[row["id"]] = sub_id

        self.commit_if_apply()

    def migrate_merchants(self) -> None:
        rows = self.fetch_source(
            """
            SELECT id, name, email, phone_number, address1, address2, postal_code, gst_number, pan,
                   is_active, deleted_at, created_at, updated_at, metadata
            FROM merchant_merchant
            ORDER BY id
            """
        )
        for row in rows:
            mid = stable_uuid("merchants", row["id"])
            address_parts = [as_str(row.get("address1")), as_str(row.get("address2"))]
            address = ", ".join([p for p in address_parts if p])
            if self.apply:
                self.execute_target(
                    """
                    INSERT INTO merchants (
                      id, name, email, phone, address, postal_code, gst_number, pan,
                      is_active, deleted_at, created_at, updated_at, metadata
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                      name=EXCLUDED.name,
                      email=EXCLUDED.email,
                      phone=EXCLUDED.phone,
                      address=EXCLUDED.address,
                      postal_code=EXCLUDED.postal_code,
                      gst_number=EXCLUDED.gst_number,
                      pan=EXCLUDED.pan,
                      is_active=EXCLUDED.is_active,
                      deleted_at=EXCLUDED.deleted_at,
                      updated_at=EXCLUDED.updated_at,
                      metadata=EXCLUDED.metadata
                    """,
                    (
                        str(mid),
                        as_str(row["name"], f"Legacy Merchant {row['id']}"),
                        row.get("email"),
                        row.get("phone_number"),
                        address or None,
                        row.get("postal_code"),
                        row.get("gst_number"),
                        row.get("pan"),
                        as_bool(row.get("is_active")),
                        row.get("deleted_at"),
                        row.get("created_at"),
                        row.get("updated_at"),
                        json_param(row.get("metadata")),
                    ),
                )
            self.merchant_map[row["id"]] = mid
            self.stats.merchants += 1

        self.commit_if_apply()

    def migrate_users(self) -> None:
        rows = self.fetch_source(
            """
            SELECT id, username, email, phone, password, is_active, is_verified, is_superuser, is_staff,
                   merchant_id, created_at, last_login, deleted_at, metadata, permission
            FROM user_user
            ORDER BY id
            """
        )
        seen_usernames: set[str] = set()
        seen_emails: set[str] = set()
        seen_phones: set[str] = set()
        existing_phone_rows = self.fetch_target("SELECT id, phone FROM users WHERE phone IS NOT NULL")
        existing_phone_owner: dict[str, str] = {}
        for row in existing_phone_rows:
            phone = normalize_phone(row.get("phone"))
            if not phone:
                continue
            seen_phones.add(phone)
            existing_phone_owner[phone] = str(row["id"])
        for row in rows:
            uid = stable_uuid("users", row["id"])
            merchant_id = self.merchant_map.get(row["merchant_id"])

            username_base = as_str(row.get("username"), f"legacy_user_{row['id']}")
            username = username_base
            if username.lower() in seen_usernames:
                username = f"{username_base}_{row['id']}"
            seen_usernames.add(username.lower())

            email = as_str(row.get("email"))
            if not email:
                email = f"legacy_user_{row['id']}@migrated.local"
            if email.lower() in seen_emails:
                email = f"legacy_user_{row['id']}@migrated.local"
            seen_emails.add(email.lower())

            phone = normalize_phone(row.get("phone"))
            if phone:
                # If phone already belongs to a different target user, null it out
                # to preserve unique constraint and continue migration.
                current_owner = existing_phone_owner.get(phone)
                if current_owner and current_owner != str(uid):
                    phone = None
                elif phone in seen_phones:
                    phone = None
                else:
                    seen_phones.add(phone)
                    existing_phone_owner[phone] = str(uid)

            user_type = "dealer"
            role = row.get("permission") or "admin"
            if row.get("is_superuser") or row.get("is_staff"):
                user_type = "admin"
                role = "super_admin"
                merchant_id = None

            if self.apply:
                self.execute_target(
                    """
                    INSERT INTO users (
                      id, username, email, phone, password_hash, user_type, merchant_id, role,
                      preferred_language, is_verified, is_active, created_at, last_login, deleted_at, metadata
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                      username=EXCLUDED.username,
                      email=EXCLUDED.email,
                      phone=EXCLUDED.phone,
                      password_hash=EXCLUDED.password_hash,
                      user_type=EXCLUDED.user_type,
                      merchant_id=EXCLUDED.merchant_id,
                      role=EXCLUDED.role,
                      is_verified=EXCLUDED.is_verified,
                      is_active=EXCLUDED.is_active,
                      last_login=EXCLUDED.last_login,
                      deleted_at=EXCLUDED.deleted_at,
                      metadata=EXCLUDED.metadata
                    """,
                    (
                        str(uid),
                        username,
                        email,
                        phone,
                        row.get("password") or "legacy-password-reset-required",
                        user_type,
                        str(merchant_id) if merchant_id else None,
                        role,
                        "en",
                        as_bool(row.get("is_verified"), False),
                        as_bool(row.get("is_active"), True),
                        row.get("created_at"),
                        row.get("last_login"),
                        row.get("deleted_at"),
                        json_param(row.get("metadata")),
                    ),
                )
            self.user_map[row["id"]] = uid
            if row.get("merchant_id") and row["merchant_id"] not in self.primary_user_by_merchant:
                self.primary_user_by_merchant[row["merchant_id"]] = uid
            self.stats.users += 1

        self.commit_if_apply()

    def _resolve_product_user(self, legacy_created_by: int | None, legacy_merchant_id: int | None) -> uuid.UUID | None:
        if legacy_created_by and legacy_created_by in self.user_map:
            return self.user_map[legacy_created_by]
        if legacy_merchant_id and legacy_merchant_id in self.primary_user_by_merchant:
            return self.primary_user_by_merchant[legacy_merchant_id]
        return None

    def migrate_products(self) -> None:
        rows = self.fetch_source(
            """
            SELECT id, name, brand, packing_per_box, application_type_id, make_type_id, surface_type_id,
                   body_type_id, quality_id, height_in_inches, width_in_inches, height_in_mm, width_in_mm,
                   quantity, category_id, merchant_id, is_active, created_at, updated_at
            FROM tile_product
            ORDER BY id
            """
        )
        for row in rows:
            merchant_id = self.merchant_map.get(row["merchant_id"])
            if not merchant_id:
                continue

            app_id = self.app_map.get(row["application_type_id"])
            surface_id = self.surface_map.get(row["surface_type_id"])
            body_id = self.body_map.get(row["body_type_id"])
            quality_id = self.quality_map.get(row["quality_id"])
            make_id = self.make_map.get(row["make_type_id"]) if row.get("make_type_id") else None
            sub_category_id = self.subcategory_map.get(row["category_id"])

            if not all([app_id, surface_id, body_id, quality_id]):
                continue

            # Fallback when category mapping is missing: derive/create sub-category from product dimensions+make.
            if not sub_category_id:
                make_fallback = make_id or next(iter(self.make_map.values()), None)
                if not make_fallback:
                    continue
                size_label = f"{row['height_in_inches']}x{row['width_in_inches']}"
                category_row = self.fetch_one_target(
                    "SELECT id FROM categories WHERE LOWER(slug)=LOWER(%s) LIMIT 1",
                    ("tiles",),
                )
                if not category_row:
                    continue
                existing_sub = self.fetch_one_target(
                    """
                    SELECT id FROM sub_categories
                    WHERE category_id=%s AND size=%s AND make_type_id=%s
                    LIMIT 1
                    """,
                    (str(category_row["id"]), size_label, str(make_fallback)),
                )
                if existing_sub:
                    sub_category_id = existing_sub["id"]
                else:
                    sub_category_id = stable_uuid("sub_categories_fallback", row["id"])
                    if self.apply:
                        self.execute_target(
                            """
                            INSERT INTO sub_categories (
                              id, category_id, name, size, height_inches, width_inches, height_mm, width_mm,
                              make_type_id, default_packing_per_box, is_active
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT (id) DO NOTHING
                            """,
                            (
                                str(sub_category_id),
                                str(category_row["id"]),
                                f"{size_label} Legacy",
                                size_label,
                                row["height_in_inches"],
                                row["width_in_inches"],
                                row["height_in_mm"],
                                row["width_in_mm"],
                                str(make_fallback),
                                row.get("packing_per_box") or 10,
                                as_bool(row.get("is_active"), True),
                            ),
                        )

            pid = stable_uuid("products", row["id"])
            if self.apply:
                self.execute_target(
                    """
                    INSERT INTO products (
                      id, merchant_id, sub_category_id, brand, name, sku,
                      surface_type_id, application_type_id, body_type_id, quality_id,
                      current_quantity, packing_per_box, is_active, created_at, updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                      merchant_id=EXCLUDED.merchant_id,
                      sub_category_id=EXCLUDED.sub_category_id,
                      brand=EXCLUDED.brand,
                      name=EXCLUDED.name,
                      surface_type_id=EXCLUDED.surface_type_id,
                      application_type_id=EXCLUDED.application_type_id,
                      body_type_id=EXCLUDED.body_type_id,
                      quality_id=EXCLUDED.quality_id,
                      current_quantity=EXCLUDED.current_quantity,
                      packing_per_box=EXCLUDED.packing_per_box,
                      is_active=EXCLUDED.is_active,
                      updated_at=EXCLUDED.updated_at
                    """,
                    (
                        str(pid),
                        str(merchant_id),
                        str(sub_category_id),
                        as_str(row["brand"], "Legacy Brand"),
                        as_str(row["name"], f"Legacy Product {row['id']}"),
                        None,
                        str(surface_id),
                        str(app_id),
                        str(body_id),
                        str(quality_id),
                        row.get("quantity") or 0,
                        row.get("packing_per_box") or 10,
                        as_bool(row.get("is_active"), True) and row.get("deleted_at") is None,
                        row.get("created_at"),
                        row.get("updated_at"),
                    ),
                )
            self.product_map[row["id"]] = pid
            self.stats.products += 1

        self.commit_if_apply()

    def migrate_images(self) -> None:
        cols = self.target_columns("product_images")
        has_public_url = "public_url" in cols
        has_created_at = "created_at" in cols
        has_updated_at = "updated_at" in cols
        has_uploaded_by = "uploaded_by" in cols
        has_uploaded_at = "uploaded_at" in cols

        rows = self.fetch_source(
            """
            SELECT id, product_id, image, is_primary, ordering, created_at, updated_at, created_by_id
            FROM tile_image
            ORDER BY id
            """
        )
        for row in rows:
            product_id = self.product_map.get(row["product_id"])
            if not product_id:
                continue
            uploaded_by = self._resolve_product_user(row.get("created_by_id"), None)
            image_id = stable_uuid("product_images", row["id"])
            if self.apply:
                if has_public_url and has_created_at and has_updated_at and has_uploaded_by:
                    self.execute_target(
                        """
                        INSERT INTO product_images (
                          id, product_id, image_url, public_url, is_primary, ordering, created_at, updated_at, uploaded_by
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO UPDATE SET
                          product_id=EXCLUDED.product_id,
                          image_url=EXCLUDED.image_url,
                          public_url=EXCLUDED.public_url,
                          is_primary=EXCLUDED.is_primary,
                          ordering=EXCLUDED.ordering,
                          updated_at=EXCLUDED.updated_at,
                          uploaded_by=EXCLUDED.uploaded_by
                        """,
                        (
                            str(image_id),
                            str(product_id),
                            as_str(row["image"]),
                            as_str(row["image"]),
                            as_bool(row.get("is_primary"), False),
                            row.get("ordering") or 0,
                            row.get("created_at"),
                            row.get("updated_at"),
                            str(uploaded_by) if uploaded_by else None,
                        ),
                    )
                elif has_uploaded_at:
                    self.execute_target(
                        """
                        INSERT INTO product_images (
                          id, product_id, image_url, is_primary, ordering, uploaded_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO UPDATE SET
                          product_id=EXCLUDED.product_id,
                          image_url=EXCLUDED.image_url,
                          is_primary=EXCLUDED.is_primary,
                          ordering=EXCLUDED.ordering,
                          uploaded_at=EXCLUDED.uploaded_at
                        """,
                        (
                            str(image_id),
                            str(product_id),
                            as_str(row["image"]),
                            as_bool(row.get("is_primary"), False),
                            row.get("ordering") or 0,
                            row.get("created_at"),
                        ),
                    )
                else:
                    self.execute_target(
                        """
                        INSERT INTO product_images (
                          id, product_id, image_url, is_primary, ordering
                        )
                        VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO UPDATE SET
                          product_id=EXCLUDED.product_id,
                          image_url=EXCLUDED.image_url,
                          is_primary=EXCLUDED.is_primary,
                          ordering=EXCLUDED.ordering
                        """,
                        (
                            str(image_id),
                            str(product_id),
                            as_str(row["image"]),
                            as_bool(row.get("is_primary"), False),
                            row.get("ordering") or 0,
                        ),
                    )
            self.stats.images += 1

        self.commit_if_apply()

    def migrate_transactions(self) -> None:
        rows = self.fetch_source(
            """
            SELECT l.id, l.product_id, l.quantity, l.created_at, l.created_by_id, p.merchant_id
            FROM tile_productquantitylog l
            JOIN tile_product p ON p.id = l.product_id
            ORDER BY l.product_id, l.created_at, l.id
            """
        )
        running_qty: dict[int, int] = {}
        for row in rows:
            target_product_id = self.product_map.get(row["product_id"])
            if not target_product_id:
                continue
            merchant_id = self.merchant_map.get(row["merchant_id"])
            if not merchant_id:
                continue
            user_id = self._resolve_product_user(row.get("created_by_id"), row.get("merchant_id"))
            if not user_id:
                # Skip transaction rows where no mapped actor exists.
                continue

            qty_change = int(row.get("quantity") or 0)
            if qty_change == 0:
                # Legacy logs sometimes contain zero-delta entries; target schema
                # enforces quantity > 0 for transactions, so skip these rows.
                continue
            before = running_qty.get(row["product_id"], 0)
            after = before + qty_change
            running_qty[row["product_id"]] = after

            tx_type = "add" if qty_change >= 0 else "subtract"
            tx_id = stable_uuid("product_transactions", row["id"])
            if self.apply:
                self.execute_target(
                    """
                    INSERT INTO product_transactions (
                      id, product_id, merchant_id, user_id, transaction_type, quantity,
                      quantity_before, quantity_after, notes, created_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                      product_id=EXCLUDED.product_id,
                      merchant_id=EXCLUDED.merchant_id,
                      user_id=EXCLUDED.user_id,
                      transaction_type=EXCLUDED.transaction_type,
                      quantity=EXCLUDED.quantity,
                      quantity_before=EXCLUDED.quantity_before,
                      quantity_after=EXCLUDED.quantity_after,
                      created_at=EXCLUDED.created_at
                    """,
                    (
                        str(tx_id),
                        str(target_product_id),
                        str(merchant_id),
                        str(user_id),
                        tx_type,
                        abs(qty_change),
                        before,
                        after,
                        "Migrated from legacy tile_productquantitylog",
                        row.get("created_at"),
                    ),
                )
            self.stats.transactions += 1

        self.commit_if_apply()

    def run(self) -> None:
        try:
            self.migrate_reference_data()
            self.migrate_merchants()
            self.migrate_users()
            self.migrate_products()
            self.migrate_images()
            self.migrate_transactions()
        except Exception:
            self.rollback()
            raise


def print_summary(stats: MigrationStats, apply: bool) -> None:
    mode = "APPLY" if apply else "DRY-RUN"
    print(f"\nPhase 1 migration summary ({mode})")
    print("=" * 42)
    print(f"Body types           : {stats.body_types}")
    print(f"Make types           : {stats.make_types}")
    print(f"Surface types        : {stats.surface_types}")
    print(f"Application types    : {stats.application_types}")
    print(f"Qualities            : {stats.qualities}")
    print(f"Categories           : {stats.categories}")
    print(f"Sub-categories       : {stats.sub_categories}")
    print(f"Merchants            : {stats.merchants}")
    print(f"Users                : {stats.users}")
    print(f"Products             : {stats.products}")
    print(f"Images               : {stats.images}")
    print(f"Transactions         : {stats.transactions}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Phase 1 legacy -> SupplySync migration")
    parser.add_argument("--source-db-url", required=True, help="Legacy DB URL (e.g. postgresql://user:pass@host:5432/db)")
    parser.add_argument("--target-db-url", required=True, help="Target DB URL (usually local supplysync test DB)")
    parser.add_argument("--apply", action="store_true", help="Persist changes (default is dry-run)")
    args = parser.parse_args()

    migrator = Migrator(args.source_db_url, args.target_db_url, args.apply)
    try:
        migrator.run()
        print_summary(migrator.stats, args.apply)
    finally:
        migrator.close()


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Migration failed: {exc}", file=sys.stderr)
        sys.exit(1)
