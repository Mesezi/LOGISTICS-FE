# Frontend UI & UX Specification

## Tech Stack & Architecture

To keep the codebase lean, predictable, and fast, the frontend is built on a modern, lightweight stack where each tool has one clear job:

* **UI Components (`shadcn/ui` + Tailwind CSS):** Accessible, clean primitives (`Sheet` for slide-over forms, `Command` for instant bank/location autocomplete, `Dialog` for safe cancellations, `Badge` for status pills, and `Table` for scannable ledgers).

* **Server State & Caching (`TanStack React Query`):** Handles all API communication, automatic background refetching, loading skeletons, and cache invalidation (e.g., logging a payment automatically refreshes the job's remaining debt and the daily summary).

* **Client UI State (`Zustand`):** Minimal global store strictly for ephemeral UI state—such as active slide-over drawers, selected dashboard date filters, and modal states—avoiding prop drilling without duplicating server data.

* **Forms & Validation (`React Hook Form` + `Zod`):** Mirrors the backend NestJS business rules on the client (e.g., enforcing `bank_name` when payment mode is `transfer`, preventing a rider and sublet from being selected together, and validating `note` inputs) so users get instant, inline feedback before hitting the network.

## Design Philosophy: Straightforward & Simple

The goal of the user interface is speed, clarity, and zero friction. Dispatchers and admins work in a fast-paced environment and need to book jobs, log payments, and track expenses in seconds—without digging through nested menus or dealing with cluttered forms.

### Core UX Principles

1. **Live Math, Zero Guesswork:** Totals, remaining debts, and net profits calculate automatically on the screen as the user types.

2. **Smart Defaults & Autocomplete:** Frequently used banks and service locations pop up immediately via `shadcn/ui` `Command` comboboxes (`GET /search/banks` and `GET /search/locations`), reducing typing errors.

3. **Progressive Disclosure:** Only show fields that matter right now. (e.g., hide sublet fields if a rider is selected; only show `bank_name` when payment mode is `transfer`).

4. **Client-Side Guardrails (`Zod`):** Prevent invalid submissions before they hit the server with clear, plain-English inline messages.

## Navigation Structure

Keep navigation flat with a persistent left sidebar (desktop) or bottom tab bar (mobile):

* **Dashboard (Daily Summary)** — Default landing screen

* **Jobs** — Active dispatches, booking, and payments

* **Expenses** — Daily operational costs

* **Directory** — Clients & Riders

* **Reports** — Financial breakdowns & statements

* **Settings (Admin Only)** — Team invites, roles, and Audit Log

## Screen-by-Screen Blueprint

### 1. Dashboard (Daily Summary)

Designed to answer *"How did we do today?"* at a single glance.

* **Top Date Picker:** Stored in `Zustand`, defaults to **Today** (`Africa/Lagos` time), with quick `< Yesterday` / `Today` toggles.

* **4 KPI Summary Cards:**

  * **Office Income:** Total office fees earned today.

  * **Cash/Bank Collected:** Actual payments received today.

  * **Total Expenses:** All logged expenses today.

  * **Outstanding Debt:** Unpaid balances from today's jobs.

* **Quick Action Bar:** Three prominent primary buttons that trigger global `Zustand` drawers: `[ + New Job ]`, `[ + Log Payment ]`, `[ + Log Expense ]`.

* **Today's Activity Feed:** A clean, scannable `shadcn/ui` Table of today's jobs with color-coded status badges (`Pending`, `Completed`, `Cancelled`) and payment pills (`Paid`, `Part-Paid`, `Unpaid`).

### 2. Jobs & Booking Flow

The heart of the application.

#### A. Jobs List View

* **Filter Pills:** `All`, `Unpaid`, `Has Sublet`, `Has Partner`, `Cancelled` + Search input and Date range.

* **Table Columns:** Date, Client, Route (Pickup $\rightarrow$ Drop-off), Assigned To (Rider Name or Sublet Name), Total Fee, Paid / Debt, Status.

#### B. Create / Edit Job Form (`shadcn/ui` `Sheet` Drawer)

Validated in real-time with a strict `Zod` schema:

* **Section 1: Route & Client**

  * Client selector (searchable combobox with quick-create option).

  * Pickup Location & Drop-off Location (powered by Location Autocomplete).

* **Section 2: Execution (Mutually Exclusive `Tabs` or `RadioGroup`)**

  * Toggle between **In-House Rider** or **Sublet**.

  * *If Rider:* Show Rider dropdown. (Sublet fields stay hidden and cleared in form state).

  * *If Sublet:* Show Sublet Name & Sublet Amount inputs. (Rider dropdown stays hidden and cleared).

* **Section 3: Fees & Partner**

  * **Office Fee** (Required) & **Park / Waybill Fee** (Optional).

  * Optional `Switch`: `+ Add Partner` $\rightarrow$ reveals Partner Name & Partner Amount (`Zod` enforces both must be filled together).

* **Sticky Footer Bar:**

  * Displays **Live Calculated Total** in bold (`Office + Park + Sublet + Partner`) alongside `[ Cancel ]` and `[ Save Job ]`.

#### C. Job Detail & Payment Panel

Clicking any job opens a clean detail view or wide `Sheet`:

* **Financial Summary Strip:** `Job Total` | `Total Paid` | `Remaining Debt` | `Net Office Profit`.

* **Payments & Refunds List:** Shows every transaction logged against the job.

* **Inline "Add Payment / Refund" Form (`Zod` Validated):**

  * **Type:** `Payment` or `Refund` segmented toggle.

  * **Amount:** Numeric input (pre-filled with remaining debt for convenience; `Zod` caps payment at remaining debt and refund at total paid).

  * **Mode:** `Cash`, `Transfer`, `POS`.

  * **Bank Name (`bank_name`):** *Conditionally rendered and required by `Zod` only when Mode is `Transfer`.* Powered by Bank Autocomplete.

  * **Note (`note`):** Optional text input for transfer references, split-payment context, or remarks (e.g., *"Part of 50k bulk transfer"*).

* **Danger Zone (Bottom):**

  * `Cancel Job` button (opens `AlertDialog`; if money was paid, requires selecting a refund mode and optional note before confirming).

  * `Delete Job` button (only rendered if `Total Paid === 0`).

### 3. Expenses

Simple, single-screen ledger for tracking money going out.

* **Inline Quick-Add Bar (Top of page):**

  * **Owner Type:** Segmented toggle `[ Rider ]` `[ Office ]` `[ Client ]`.

  * **Conditional Target (`Zod` SuperRefine):**

    * Selecting `Rider` shows and requires the Rider combobox.

    * Selecting `Client` shows and requires the Client combobox.

    * Selecting `Office` hides and clears the target field completely.

  * **Amount**, **Bank Name (`bank_name`)** (optional, via autocomplete), **Note (`note`)** (what the expense was for), and `[ + Add ]`.

* **Expense Table:** Filterable by date and owner type, with one-click edit/delete actions that invalidate the React Query cache immediately.

### 4. Directory (Clients & Riders)

Two simple `Tabs` on one page to keep the sidebar uncluttered.

* **Clients Tab:** Searchable list of clients, phone numbers, total jobs, and current unpaid debt balance. Clicking a client opens their profile and statement link.

* **Riders Tab:** List of riders with an `Active / Inactive` `Switch` right on the row (optimistically updated via React Query mutation, no delete button).

### 5. Reports

Clean, printable/exportable tables with zero clutter.

* **Report Selector `Tabs`:** `Income` | `Riders` | `Sublets` | `Partners` | `Debts` | `Failed Jobs` | `Client Statement`

* **Consistent Layout:**

  * Date Range Picker (plus Client combobox on the Statement tab).

  * **Summary Banner** at the top showing the grand total in large plain numbers.

  * **Clean Data Table** underneath with an `[ Export CSV / Print ]` button.

### 6. Admin Settings & Audit Log

* **Team Management:** Invite new staff via email (`POST /users/invite`) and toggle user roles between `Staff` and `Admin`.

* **Audit Log Viewer:** Read-only timeline showing *Who* changed *What*, *When*, with a simple expandable diff (`Before` $\rightarrow$ `After`) for full accountability.