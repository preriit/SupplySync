# Database migrations (existing PostgreSQL databases)

The Python models expect columns that are added by SQL files in this folder. If you see:

`UndefinedColumn: column sub_categories.application_type_id does not exist`

(or similar for `size_id`, `coverage_per_pc_sqm`, `products.coverage_*`, …)

**apply the patches** (from the `backend` directory, with `DATABASE_URL` set in `.env`):

```bash
python run_supplysync_migrations.py
```

That runs, in order:

1. `add_subcategory_size_id.sql`
2. `add_subcategory_application_body.sql` — adds `application_type_id`, `body_type_id`, makes `make_type_id` nullable, updates unique indexes
3. `add_coverage_fields.sql` — coverage columns on `sub_categories` and `products`
4. `add_snapshot_label_columns.sql` — denormalized `*_name` columns on `products` and default name snapshots on `sub_categories` (faster product lists)

Then **restart** the FastAPI/uvicorn process.

### Individual scripts (same SQL)

- `python run_add_subcategory_size_id.py`
- `python run_add_subcategory_application_body.py`
- `python run_add_coverage_fields.py`

### New installs

`reset_db.py` runs these SQL files automatically in the correct order.
