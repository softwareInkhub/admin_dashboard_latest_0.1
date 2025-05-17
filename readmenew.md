# Admin Dashboard with Pinterest Integration

## Overview
This project is a modern admin dashboard built with Next.js (App Router), TypeScript, and Tailwind CSS. It features deep integration with Pinterest, allowing users to manage Pinterest accounts, boards, and pins. The dashboard also includes a dynamic table viewer with card-based UI and persistent pinning functionality using AWS DynamoDB.

---

## Tech Stack
- **Next.js** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **React**
- **AWS DynamoDB** (for data and pin state persistence)
- **Redis** (for caching)
- **NextAuth.js** (for authentication, if enabled)
- **react-icons** (for UI icons)

---

## Pinterest Integration
- **OAuth 2.0** authentication for connecting Pinterest accounts
- **Account management**: Add, verify, and manage multiple Pinterest accounts
- **Board management**: View, organize, and manage Pinterest boards
- **Pin management**: View and organize pins within boards
- **DynamoDB tables** for storing accounts, boards, and pins:
  - `pinterest_inkhub_accounts`
  - `pinterest_inkhub_get_boards`
  - `pinterest_inkhub_get_pins`
  - (and related tables)

---

## Modal Terminal & Tab Management (Latest Features)
- **Modal Terminal:** Clicking the "Data" button on a table card opens a large, terminal-style modal displaying table details.
- **Tabs:** The modal features two tabs: **Table Info** and **Table Data**.
- **Independent Tab Closing:**
  - Each tab has its own close (cross) button.
  - Closing the active tab switches to the other tab if it is open.
  - If you close the last remaining tab, the modal closes.
- **Larger Modal:** The modal is now wider and taller for improved data visibility.
- **Tab Navigation:** Tab navigation is visually attached to the bottom left of the modal, with close buttons next to each tab label (only the active tab shows its close button).

---

## Table Card UI & Pinning Feature
- **Tables are displayed as cards** (not dropdowns) for easy browsing
- **Pin icon** on each card allows users to pin/unpin tables
- **Pinned tables** appear in a separate, prominent section at the top
- **Unpinned tables** are shown below in their own section
- **Card UI** is aesthetic, readable, and responsive
- **Pinned state is persisted** across refreshes and devices using DynamoDB
- **Data Modal:** Each card has a "Data" button to open a modal terminal for table details and data, with advanced tab and close behavior

---

## Pin State Persistence (DynamoDB)
- **API route:** `/src/app/api/user/pinned-tables/route.ts`
  - `GET`: Returns the user's pinned tables (empty array if none)
  - `POST`: Updates the user's pinned tables
- **Frontend integration:**
  - Loads pinned tables on mount
  - Saves pinned tables on change
- **DynamoDB table:** `user_pinned_tables` with partition key `userId` (string)
- **User ID:**
  - **Current setup:** Uses a placeholder (`demo-user`).
  - **Limitation:** Without authentication, all users share the same pin state. This can lead to pins being lost or overwritten if multiple users or browsers are used.
  - **Recommendation:** For production or multi-user environments, implement authentication (e.g., with NextAuth.js) and use a real, unique user ID for each user. This ensures each user's pins are private and persistent.

---

## Authentication (Recommended for Production)
- **Why:** Without authentication, pin state is not user-specific and can be lost or overwritten.
- **How:**
  - Integrate [NextAuth.js](https://next-auth.js.org/) or your preferred authentication system.
  - In your API route, extract the user ID from the session and use it as the DynamoDB key.
  - Example:
    ```js
    import { getServerSession } from 'next-auth/next';
    // ...
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    ```
- **Result:** Each user's pins are stored and loaded separately, ensuring true persistence and privacy.

---

## How to Set Up & Run
1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Configure environment variables** for AWS, Pinterest, etc.
3. **Set up DynamoDB tables** as described above
4. **Run the development server:**
   ```bash
   npm run dev
   ```
5. **Access the dashboard** at `http://localhost:3000`

---

## Special Notes
- **Authentication:** For true user-specific pinning, integrate with NextAuth or your auth system and update the API route to use the real user ID.
- **First-time users:** The API and UI gracefully handle users who have never pinned a table (returns an empty array, no errors).
- **UI/UX (Updated):**
  - Card view is responsive and visually clear
  - Pinned cards have a distinct border and background
  - Section headings are bold and easy to read
  - Modal terminal is large and user-friendly
  - Tab navigation is intuitive, with independent close for each tab
  - Closing a tab switches to the other tab, closing the last tab closes the modal
  - **Sidebar is now simplified:** The "Saved Tables" section has been removed for a cleaner navigation experience.

---

## Features Added in This Session
- Deep Pinterest integration (OAuth, board/pin/account management)
- Card-based table selection UI (replacing dropdown)
- Pin/unpin functionality for tables
- Persistent pin state using DynamoDB and custom API
- Sectioned view for pinned and unpinned tables
- Improved card aesthetics and section headings
- Robust handling of empty states and first-time users
- **Modal terminal for table details and data**
- **Independent tab closing and advanced tab navigation in modal**
- **Larger, more readable modal for data viewing**
- **Sidebar "Saved Tables" section removed for a cleaner UI**

---

## Next Steps / Customization
- Integrate real authentication for user-specific pinning
- Further customize card UI or add more metadata
- Expand Pinterest features as needed

---

**Enjoy your modern, Pinterest-powered admin dashboard!**
