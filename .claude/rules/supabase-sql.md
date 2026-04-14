---
paths:
  - "*.sql"
  - "supabase/**"
---

## SQL Style

### General

- Lowercase SQL reserved words for consistency. Exception: migration files may use uppercase keywords for readability of function definitions
- Consistent, descriptive identifiers for tables, columns, and other DB objects
- Whitespace and indentation for readability
- ISO 8601 dates (`yyyy-mm-ddThh:mm:ss.sssss`)
- Comments: `/* ... */` for block, `--` for line (use for complex logic)

### Naming

- Avoid reserved words; names unique and under 63 characters
- `snake_case` for tables and columns
- **Plural** table names, **singular** column names
- No prefixes like `tbl_`; no table name matching its column names

### Tables

- Always add an `id` column of type `identity generated always` unless otherwise specified
- Create all tables in the `public` schema unless otherwise specified
- Always schema-qualify in queries
- Always add a comment describing the table (up to 1024 chars)

### Columns

- Singular names; avoid generic names like `id` on FKs
- Foreign keys: `{singular_table}_id` (e.g., `user_id` → `users`)
- Lowercase except for acronyms or readability exceptions

Example:

```sql
create table books (
  id bigint generated always as identity primary key,
  title text not null,
  author_id bigint references authors (id)
);
comment on table books is 'A list of all the books in the library.';
```

### Queries

Short queries on a few lines; add newlines as they grow. Add spaces for readability.

Small:

```sql
select *
from employees
where end_date is null;

update employees
set end_date = '2023-12-31'
where employee_id = 1001;
```

Larger:

```sql
select
  first_name,
  last_name
from employees
where start_date between '2021-01-01' and '2021-12-31' and status = 'employed';
```

### Joins and Subqueries

Format for clarity, align with related clauses. Prefer full table names.

```sql
select
  employees.employee_name,
  departments.department_name
from
  employees
  join departments on employees.department_id = departments.department_id
where employees.start_date > '2022-01-01';
```

### Aliases

Meaningful aliases that reflect the data; always include `as`:

```sql
select count(*) as total_employees
from employees
where end_date is null;
```

### Complex Queries / CTEs

For extremely complex queries, prefer a CTE. Keep it clear and linear (readability over performance). Comment each block.

```sql
with
  department_employees as (
    -- All employees and their departments
    select
      employees.department_id,
      employees.first_name,
      employees.last_name,
      departments.department_name
    from
      employees
      join departments on employees.department_id = departments.department_id
  ),
  employee_counts as (
    -- Count employees per department
    select
      department_name,
      count(*) as num_employees
    from department_employees
    group by department_name
  )
select
  department_name,
  num_employees
from employee_counts
order by department_name;
```
