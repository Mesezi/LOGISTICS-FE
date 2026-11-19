# Logistics API Reference

This document describes the HTTP routes currently implemented by the NestJS application. Swagger UI is available at `/api/docs`, and the OpenAPI document is at `/api/docs-json`.

## Conventions

- **Base URL:** The application does not currently set a global prefix. For local development, use `http://localhost:8000`.
- **Authentication:** Protected routes require `Authorization: Bearer <Clerk-session-token>`. The global auth guard requires a registered user linked to an account.
- **Authorization:** Account settings and audit-log reads require the `admin` role. Other business routes require an authenticated account user.
- **Company scope:** Business records and reports are scoped to the authenticated user's `accountId`.
- **Pagination:** List routes default to `page=1` and `limit=50`; `limit` is capped at 100. Paginated responses include `data` and `meta`.
- **Dates:** Job and expense date filters use date strings. Report date ranges use inclusive `YYYY-MM-DD` dates.
- **Amounts:** Monetary values are integer amounts in the application's smallest currency unit; the API does not include currency metadata.
- **Errors:** Standard NestJS error bodies contain `statusCode`, `message`, and `error`.
- **PATCH requests:** Send only the fields being changed. `/jobs/:id`, `/partners/:id`, and `/accounts/me` use update DTOs. Other PATCH handlers currently use TypeScript `Partial<...>` types, which do not provide class-validator runtime metadata; do not rely on create-time DTO validation for those routes. Service-level business rules still apply.

> **Current guard behavior:** The global auth guard protects `/`, `/health`, and the auth routes too; they are not currently decorated as public. Signup/registration flows should be reviewed before relying on them for users who do not already pass the guard.

## Health and root

### `GET /`

Returns the root greeting.

**Response**

```json
"Hello World!"
```

### `GET /health`

**Response**

```json
{ "status": "ok" }
```

## Authentication

### `POST /auth/register`

Create an account for the signed-in Clerk user.

**Request**

```json
{ "account_name": "Acme Logistics" }
```

**Response**

```json
{
  "account": {
    "id": 3,
    "name": "Acme Logistics",
    "created_at": "2026-11-18T10:00:00.000Z",
    "updated_at": "2026-11-18T10:00:00.000Z",
    "image_url": null
  },
  "user": {
    "id": 7,
    "account_id": 3,
    "clerk_id": "user_clerk_id",
    "name": "Example User",
    "email": "user@example.com",
    "image_url": null,
    "role": "admin",
    "created_at": "2026-11-18T10:00:00.000Z"
  }
}
```

### `POST /auth/accept-invitation`

Accept an invitation using its token. The signed-in Clerk account's profile supplies the user's name, email, and image.

**Request**

```json
{ "token": "invitation-token" }
```

**Response**

```json
{
  "user": {
    "id": 8,
    "account_id": 3,
    "clerk_id": "user_clerk_id",
    "name": "Example User",
    "email": "user@example.com",
    "image_url": null,
    "role": "staff",
    "created_at": "2026-11-18T10:00:00.000Z"
  }
}
```

### `GET /users/me`

Synchronizes the signed-in user's name, email, and image from Clerk, then returns the user database row.

**Response:** The signed-in user row with `id`, `account_id`, `clerk_id`, `name`, `email`, `image_url`, `role`, and `created_at`, plus an `account` summary:

```json
{
  "account": {
    "id": 3,
    "name": "Acme Logistics",
    "image_url": null
  }
}
```

### `POST /users/invite` — Admin

Create a pending invitation. The current service stores the invitation, but sending an email is not implemented yet.

**Request**

```json
{
  "email": "staff@example.com",
  "role": "staff"
}
```

`role` is `staff` or `admin`.

**Response**

```json
{
  "message": "Invitation sent",
  "data": {
    "id": 15,
    "email": "staff@example.com",
    "role": "staff",
    "expires_at": "2026-11-25T10:00:00.000Z"
  }
}
```

The invitation token is not included in the response, and no invitation email is sent yet.

## Account settings

### `PATCH /accounts/me` — Admin

Update the current account row. Clerk-managed user and organization settings are not changed.

**Request** — provide at least one field:

```json
{
  "name": "Acme Logistics",
  "image_url": "https://example.com/logo.png"
}
```

To clear the image, send `"image_url": null`. `name` is limited to 100 characters and `image_url` must be a URL when non-null.

**Response**

```json
{
  "data": {
    "id": 3,
    "name": "Acme Logistics",
    "image_url": "https://example.com/logo.png",
    "created_at": "2026-11-18T10:00:00.000Z",
    "updated_at": "2026-11-18T10:05:00.000Z"
  }
}
```

## Clients

### `GET /clients`

List clients ordered by name.

**Query parameters:** `query` (case-insensitive name search), `mine` (`true` to show only clients created by the current user), `page`, `limit`.

**Response**

```json
{
  "data": [
    {
      "id": 12,
      "account_id": 3,
      "user_id": 7,
      "name": "Example Client",
      "phone": "+2348000000000",
      "notes": null,
      "created_at": "2026-11-18T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 50,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

### `POST /clients`

**Request**

```json
{
  "name": "Example Client",
  "phone": "+2348000000000",
  "notes": "Deliveries accepted weekdays"
}
```

`name` is required; `phone` and `notes` are optional.

**Response:** `{ "message": "Client created successfully", "data": { ...client } }`

### `GET /clients/:id`

**Response:** `{ "data": { ...client } }`

### `PATCH /clients/:id`

Update client fields (`name`, `phone`, `notes`).

**Request example**

```json
{
  "name": "Example Client",
  "phone": "+2348111111111",
  "notes": "Deliveries accepted weekdays"
}
```

**Response:** `{ "message": "Client updated successfully", "data": { ...client } }`

### `DELETE /clients/:id`

**Response**

```json
{ "message": "Client deleted successfully" }
```

## Riders

### `GET /riders`

**Query parameters:** `query` (case-insensitive name search), `active` (`true` or `false`), `page`, `limit`.

**Response:** Paginated `{ "data": [ ...riders ], "meta": { ... } }`.

### `POST /riders`

**Request**

```json
{ "name": "Rider One", "phone": "+2348000000000" }
```

`name` is required; `phone` is optional.

**Response:** `{ "message": "Rider created successfully", "data": { ...rider } }`

### `GET /riders/:id`

**Response:** `{ "data": { ...rider } }`

### `PATCH /riders/:id`

Update `name`, `phone`, or `active`.

**Request example**

```json
{ "active": false }
```

**Response:** `{ "message": "Rider updated successfully", "data": { ...rider } }`

## Partners

Partners are account-owned reusable records. Job-specific `partner_amount` remains on the job. Deactivate a partner with `active: false` rather than deleting it; inactive partners cannot be newly assigned to jobs.

### `GET /partners`

**Query parameters:** `query` (case-insensitive name search), `active` (`true` or `false`), `page`, `limit`. Defaults are `active` unspecified, `page=1`, and `limit=50`.

**Response**

```json
{
  "data": [
    {
      "id": 9,
      "account_id": 3,
      "name": "Partner A",
      "phone": "+2348000000000",
      "email": "partner@example.com",
      "notes": "Primary dispatch partner",
      "active": true,
      "created_at": "2026-11-18T10:00:00.000Z",
      "updated_at": "2026-11-18T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 50,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

### `POST /partners`

**Request**

```json
{
  "name": "Partner A",
  "phone": "+2348000000000",
  "email": "partner@example.com",
  "notes": "Primary dispatch partner"
}
```

`name` is required. `phone`, `email`, and `notes` are optional. Names are unique within an account, ignoring letter case and surrounding whitespace.

**Response**

```json
{
  "message": "Partner created successfully",
  "data": {
    "id": 9,
    "account_id": 3,
    "name": "Partner A",
    "phone": "+2348000000000",
    "email": "partner@example.com",
    "notes": "Primary dispatch partner",
    "active": true,
    "created_at": "2026-11-18T10:00:00.000Z",
    "updated_at": "2026-11-18T10:00:00.000Z"
  }
}
```

### `GET /partners/:id`

**Response:** `{ "data": { ...partner } }`, with the same partner fields shown in the list response.

### `PATCH /partners/:id`

Update any supplied partner fields (`name`, `phone`, `email`, `notes`, `active`).

**Request example**

```json
{ "phone": "+2348111111111", "active": false }
```

**Response:** `{ "message": "Partner updated successfully", "data": { ...partner } }`, with the same partner fields shown in the list response.

An empty update is rejected. Setting a contact field such as `phone`, `email`, or `notes` to `null` clears it. Duplicate names return `409 Conflict`.

## Jobs

### `GET /jobs`

**Query parameters:** `status` (`pending`, `picked_up`, `delivered`, `failed`, `cancelled`), `client_id`, `rider_id`, `partner_id`, `unpaid`, `has_sublet`, `has_partner`, `date_from`, `date_to`, `page`, `limit`.

`unpaid=true` currently filters to jobs with no payment records, not all jobs with a positive remaining balance. Results are ordered by `job_date` descending.

**Response:** Paginated `{ "data": [ ...jobs, each with client, rider, and partner summaries ], "meta": { ... } }`.

### `POST /jobs`

Create a job using an existing client/partner ID or inline client/partner details. The total is calculated as `office_fee + sublet_amount + park_waybill + partner_amount`. Inline client/partner records and the job are created in one transaction; if job creation fails, those new records are rolled back too.

**Request**

```json
{
  "client": {
    "name": "New Client",
    "phone": "+2348000000000",
    "notes": "Deliveries accepted weekdays"
  },
  "partner": {
    "name": "New Partner",
    "phone": "+2348111111111",
    "email": "partner@example.com",
    "notes": "Primary dispatch partner"
  },
  "rider_id": 4,
  "pickup": "Ikeja",
  "dropoff": "Lekki",
  "description": "Same-day delivery",
  "job_date": "2026-11-18",
  "office_fee": 5000,
  "sublet_name": "External courier",
  "sublet_amount": 1000,
  "park_waybill": 0,
  "partner_amount": 500
}
```

Choose exactly one client input: `client_id` for an existing account client, or `client` for a new one. `client` requires `name` and optionally accepts `phone` and `notes`. The older `client_name` string is still accepted for compatibility, but does not support entering client contact details.

Choose at most one partner input: `partner_id` for an existing active partner in the account, or `partner` for a new one. `partner` requires `name` and optionally accepts `phone`, `email`, and `notes`. When a partner is selected or created, `partner_amount` must be a positive integer. If there is no partner for the job, omit `partner_id`, `partner`, and `partner_amount` (or send `partner_amount: 0`).

`rider_id`, `description`, `job_date`, and sublet fields are optional. A sublet job cannot also have a rider. Existing client/partner IDs cannot be combined with their corresponding inline object.

**Response:** `{ "message": "Job created successfully", "data": { ...job, "total": 6500, "partner_id": 9, "partner_name_snapshot": "Partner A", "partner": { "id": 9, "name": "Partner A" } } }`

The response includes the linked `partner` summary, `partner_id`, and `partner_name_snapshot`. The snapshot preserves the partner name used for the job if the partner record is later renamed or deactivated.

#### Frontend job-creation flow

1. Load clients from `GET /clients` and partners from `GET /partners?active=true` for selection controls.
2. Let the user select an existing client or choose an option such as **Create new client**. For a new client, collect the name and optionally phone/notes, then submit the `client` object instead of `client_id`.
3. Let the user select an existing partner, choose **Create new partner**, or choose **No partner**. Submit `partner_id` for an existing partner, `partner` for a new one, or omit both for no partner.
4. When a partner is selected or created, collect a positive `partner_amount`; when no partner is selected, omit the amount or send zero.
5. Submit the selected/inline client, optional selected/inline partner, and job fields together to `POST /jobs`. On success, use `data.id`, `data.client_id`, and `data.partner`/`data.partner_id` from the response. The inline-created client is represented by `client_id` in this response; use `GET /jobs/:id` if the UI needs the populated client summary.

For existing selections, send IDs instead of inline objects:

```json
{
  "client_id": 12,
  "partner_id": 9,
  "partner_amount": 500,
  "pickup": "Ikeja",
  "dropoff": "Lekki",
  "office_fee": 5000
}
```

For a job without a partner, omit all partner fields:

```json
{
  "client_id": 12,
  "pickup": "Ikeja",
  "dropoff": "Lekki",
  "office_fee": 5000
}
```

### `GET /jobs/:id`

**Response:** `{ "data": { ...job, "client": { ... }, "rider": { ... } | null, "partner": { "id": 9, "name": "Partner A" } | null, "payments": [ ... ], "expenses": [ ... ], "received": 0, "debt": 6500, "profit": 5000 } }`

`received` is payments minus refunds; `debt` is total minus received; `profit` is office fee minus linked job expenses.

### `PATCH /jobs/:id`

Update job fields, including `partner_id` and `partner_amount`. Set `partner_id` to `null` to remove the partner assignment; if `partner_amount` is omitted when removing the partner, it is reset to zero. Fee changes recalculate `total`; a cancelled job cannot be updated, and the total cannot be lowered below the amount already received. Patch fields are optional.

**Request example**

```json
{
  "client_id": 12,
  "pickup": "Yaba",
  "dropoff": "Lekki",
  "office_fee": 6000
}
```

**Response:** `{ "message": "Job updated successfully", "data": { ...job } }`

### `DELETE /jobs/:id`

Jobs with any payment or refund record cannot be deleted.

**Response**

```json
{ "message": "Job deleted successfully" }
```

### `POST /jobs/:id/cancel`

No request body. Cancels the job and, if its net received amount is positive, creates a cash refund for that amount in the same transaction.

**Response:** `{ "message": "Job cancelled successfully", "data": { ...updatedJob } }`

## Payments and refunds

### `GET /jobs/:id/payments`

List payments and refunds for a job, oldest paid date first.

**Response:** `{ "data": [ ...payments ] }`

### `POST /jobs/:id/payments`

**Request**

```json
{
  "amount": 2000,
  "mode": "transfer",
  "bank_name": "Access Bank",
  "note": "POS transfer",
  "reference": "TRX-12345",
  "paid_at": "2026-11-18"
}
```

`amount` must be a positive integer and may not exceed the remaining job balance. `mode` is `cash` or `transfer`; `bank_name` is required for transfers. `note`, `reference`, and `paid_at` are optional.

**Response:** `{ "message": "Payment recorded successfully", "data": { ...payment } }`

### `POST /jobs/:id/refunds`

Uses the same request shape as a payment. Refund amount cannot exceed the job's net received amount.

**Response:** `{ "message": "Refund recorded successfully", "data": { ...refund } }`

### `PATCH /payments/:id`

Update payment or refund fields (`amount`, `mode`, `bank_name`, `note`, `reference`, `paid_at`). The mode and bank-name rules and payment/refund totals are revalidated.

**Request example**

```json
{
  "amount": 1500,
  "mode": "transfer",
  "bank_name": "Access Bank",
  "reference": "TRX-67890"
}
```

**Response:** `{ "message": "Payment updated successfully", "data": { ...payment } }`

### `DELETE /payments/:id`

**Response**

```json
{ "message": "Payment deleted successfully" }
```

## Expenses

### `GET /expenses`

**Query parameters:** `owner` (`rider`, `client`, `office`), `rider_id`, `client_id`, `job_id`, `date_from`, `date_to`, `page`, `limit`.

**Response:** Paginated `{ "data": [ ...expenses, each with rider and client summaries ], "meta": { ... } }`.

### `GET /expenses/:id`

**Response:** `{ "data": { ...expense, "rider": { ... } | null, "client": { ... } | null, "job": { "id": 1, "pickup": "...", "dropoff": "...", "job_date": "..." } | null } }`

### `POST /expenses`

**Request**

```json
{
  "description": "Fuel",
  "amount": 1200,
  "mode": "transfer",
  "bank_name": "Access Bank",
  "note": "Fuel for route",
  "owner": "rider",
  "rider_id": 4,
  "job_id": 21,
  "expense_date": "2026-11-18"
}
```

`description`, positive integer `amount`, `mode`, and `owner` are required. Transfer requires `bank_name`. For `owner: "rider"`, provide `rider_id`; for `owner: "client"`, provide `client_id`; for `owner: "office"`, neither is allowed. `job_id`, `bank_name`, `note`, and `expense_date` are optional where applicable.

**Response:** `{ "message": "Expense created successfully", "data": { ...expense } }`

### `PATCH /expenses/:id`

Update expense fields (`description`, `amount`, `mode`, `bank_name`, `note`, `owner`, related IDs, and `expense_date`). The owner/link and transfer/bank-name rules are revalidated.

**Request example**

```json
{
  "description": "Fuel",
  "amount": 1400,
  "mode": "cash",
  "owner": "office",
  "note": "Updated receipt total"
}
```

**Response:** `{ "message": "Expense updated successfully", "data": { ...expense } }`

### `DELETE /expenses/:id`

**Response**

```json
{ "message": "Expense deleted successfully" }
```

## Audit logs

### `GET /audit-logs` — Admin

Read-only, account-scoped audit-log listing, newest first. The endpoint reads existing rows; business write operations do not currently create audit records automatically.

**Query parameters:** `table_name`, `record_id`, `start_date`, `end_date`, `page`, `limit`. Date-only filters are inclusive UTC boundaries; timestamps are exact instants. `start_date` must be before or equal to `end_date`.

**Response**

```json
{
  "data": [
    {
      "id": 1,
      "account_id": 3,
      "user_id": 7,
      "table_name": "jobs",
      "record_id": 21,
      "action": "update",
      "before": { "status": "pending" },
      "after": { "status": "delivered" },
      "created_at": "2026-11-18T10:00:00.000Z",
      "user": { "id": 7, "name": "Example User", "email": "user@example.com" }
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 50,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

## Search suggestions

### `GET /search/banks?q=access`

Returns up to 10 case-insensitive substring matches from transfer payment and expense `bank_name` values, grouped by trimmed/lowercase name and ranked by usage count. `q` is required, maximum 100 characters.

**Response**

```json
{ "data": [{ "name": "Access Bank", "usageCount": 12 }] }
```

### `GET /search/locations?q=ikeja`

Searches account job pickup and drop-off values, grouped case-insensitively and ranked by usage. `q` is required, maximum 100 characters.

**Response**

```json
{ "data": [{ "name": "Ikeja", "usageCount": 12 }] }
```

## Reports

All reports are scoped to the current account. Optional `start_date` and `end_date` use inclusive `YYYY-MM-DD` dates and must be in chronological order.

### `GET /reports/daily?date=2026-11-18`

`date` is optional and defaults to today's date in `Africa/Lagos`.

**Response**

```json
{
  "date": "2026-11-18",
  "jobCount": 12,
  "deliveredJobs": 8,
  "failedJobs": 1,
  "cancelledJobs": 1,
  "officeFees": 24000,
  "subletFees": 1000,
  "partnerAndWaybillFees": 500,
  "paymentsReceived": 18000,
  "refundsIssued": 500,
  "expenses": 3000
}
```

Fee aggregates exclude cancelled jobs. Counts include all jobs for the date.

### `GET /reports/income`

Optional query parameters: `start_date`, `end_date`. Sums office fees only for non-cancelled jobs.

**Response**

```json
{ "jobCount": 12, "officeFees": 24000 }
```

### `GET /reports/riders`

Optional query parameters: `start_date`, `end_date`. Job dates and rider-expense dates are filtered independently. Cancelled jobs are excluded.

**Response**

```json
{
  "data": [
    {
      "riderId": 4,
      "name": "Rider One",
      "jobCount": 10,
      "deliveredJobs": 8,
      "failedJobs": 1,
      "officeFees": 20000,
      "riderExpenses": 3000
    }
  ]
}
```

### `GET /reports/sublets`

Optional query parameters: `start_date`, `end_date`. Groups non-cancelled jobs with sublets by `sublet_name`.

**Response**

```json
{
  "data": [{ "name": "External courier", "jobCount": 2, "amount": 2000 }],
  "totals": { "jobCount": 2, "amount": 2000 }
}
```

### `GET /reports/partners`
Optional query parameters: `start_date`, `end_date`. Groups non-cancelled jobs with partner fees by partner record.

**Response**

```json
{
  "data": [{ "partnerId": 9, "name": "Partner A", "jobCount": 3, "amount": 1500 }],
  "totals": { "jobCount": 3, "amount": 1500 }
}
```

### `GET /reports/failed-jobs`

Optional query parameters: `start_date`, `end_date`, `page`, `limit`. Lists failed and cancelled jobs; `netOutcome` is office fee minus expenses linked to the job.

**Response**

```json
{
  "data": [
    {
      "id": 21,
      "date": "2026-11-18",
      "status": "failed",
      "pickup": "Ikeja",
      "dropoff": "Lekki",
      "client": { "id": 12, "name": "Example Client" },
      "officeFee": 5000,
      "expenses": 1000,
      "netOutcome": 4000
    }
  ],
  "totals": { "officeFees": 5000, "expenses": 1000, "netOutcome": 4000 },
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 50,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

### `GET /reports/debts`

Optional query parameters: `start_date`, `end_date`, `page`, `limit`. Includes non-cancelled jobs with positive balances. `received` is payments minus refunds.

**Response**

```json
{
  "data": [
    {
      "id": 21,
      "date": "2026-11-18",
      "status": "pending",
      "client": { "id": 12, "name": "Example Client" },
      "rider": { "id": 4, "name": "Rider One" },
      "total": 6500,
      "received": 2000,
      "balance": 4500
    }
  ],
  "totals": { "jobCount": 1, "totalBilled": 6500, "received": 2000, "balance": 4500 },
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 50,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

### `GET /reports/client-statement?client_id=12&start_date=2026-11-01&end_date=2026-11-30`

`client_id` is required; date filters are optional. Cancelled jobs and their payments/refunds are excluded. Client-owned expenses are included as informational entries and do not change the job receivable balance.

**Response**

```json
{
  "client": { "id": 12, "name": "Example Client", "phone": "+2348000000000" },
  "period": { "start_date": "2026-11-01", "end_date": "2026-11-30" },
  "summary": {
    "openingBalance": 1000,
    "jobCharges": 5000,
    "payments": 2000,
    "refunds": 0,
    "expenses": 250,
    "closingBalance": 4000
  },
  "data": [
    {
      "date": "2026-11-18",
      "type": "job",
      "recordId": 21,
      "description": "Job charge",
      "amount": 5000,
      "balanceChange": 5000
    }
  ]
}
```

## Not currently implemented

The earlier API outline mentioned these routes, but there are no corresponding controllers yet:

- `GET /users` — list account users.
- `PATCH /users/:id/role` — change a user's role.

The invitation service also does not currently send an email; it only creates the pending invitation record.
