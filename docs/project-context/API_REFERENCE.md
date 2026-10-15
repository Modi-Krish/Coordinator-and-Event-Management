# API & WebSocket Reference

Base API URL: `http://localhost:3001` (Dev) / Production defined via `NEXT_PUBLIC_API_URL`.  
Authentication Header: `Authorization: Bearer <JWT_TOKEN>`

---

## 1. REST Endpoints

### 1.1 Authentication (`/auth`)

#### `POST /auth/register`
- **Purpose:** Registers a new user account in Supabase Auth and seeds a public profile in the database.
- **Auth:** Public.
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "name": "Jane Doe"
  }
  ```
- **Response (`201 Created`):**
  ```json
  {
    "access_token": "ey...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "Jane Doe",
      "roles": ["CITIZEN"],
      "designations": ["STUDENT"]
    }
  }
  ```
- **Error Codes:** `409 Conflict` (Email already exists or Supabase error).

#### `POST /auth/login`
- **Purpose:** Authenticates user credentials via Supabase GoTrue Auth.
- **Auth:** Public.
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response (`200 OK`):**
  ```json
  {
    "access_token": "ey...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "Jane Doe",
      "roles": ["CITIZEN"],
      "designations": ["STUDENT"]
    }
  }
  ```
- **Error Codes:** `401 Unauthorized` (Invalid credentials or missing database profile).

---

### 1.2 Issues & Tasks (`/issues`)

#### `POST /issues`
- **Purpose:** Creates an issue or operational task. Auto-assigns coordinator via round-robin if unassigned.
- **Auth:** Bearer Token (`CITIZEN`, `STAFF`, `SUPERVISOR`, `ADMIN`).
- **Request Body:**
  ```json
  {
    "title": "Water leak in Block B",
    "description": "Pipe leaking near room 204",
    "locationLat": 28.6139,
    "locationLng": 77.2090,
    "category": "Plumbing",
    "type": "ISSUE",
    "assignedToId": null
  }
  ```
- **Response (`201 Created`):** Returns created `Issue` object.
- **Side Effects:** Emits `issue:new` via WebSocket; triggers notification to assigned coordinator.

#### `GET /issues`
- **Purpose:** Retrieves issues filtered by RBAC visibility and optional type.
- **Auth:** Bearer Token.
- **Query Params:** `?type=ISSUE` or `?type=TASK`.
- **Response (`200 OK`):** Array of `Issue` objects.

#### `GET /issues/:id`
- **Purpose:** Fetches single issue details with attachments.
- **Auth:** Bearer Token.
- **Response (`200 OK`):** `Issue` object with nested `attachments: IssueAttachment[]`.

#### `PATCH /issues/:id/status`
- **Purpose:** Updates issue status (`ACCEPTED`, `IN_PROGRESS`, `RESOLVED`, `VERIFIED`, `CLOSED`).
- **Auth:** Bearer Token.
- **Rules:** Transitioning to `VERIFIED` requires `SUPERVISOR` or `ADMIN` role.
- **Request Body:**
  ```json
  { "status": "RESOLVED" }
  ```
- **Response (`200 OK`):** Updated `Issue` object.
- **Side Effects:** Emits `issue:updated` via WebSocket.

#### `PATCH /issues/:id/priority`
- **Purpose:** Modifies issue priority (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- **Auth:** Bearer Token (`STAFF`, `SUPERVISOR`, `ADMIN`).
- **Request Body:**
  ```json
  { "priority": "HIGH" }
  ```
- **Response (`200 OK`):** Updated `Issue` object.

#### `POST /issues/:id/attachments`
- **Purpose:** Uploads multipart file attachment.
- **Auth:** Bearer Token (Reporter, Assignee, Supervisor, Admin).
- **Request Form-Data:** `file: <binary>`
- **Response (`201 Created`):** `IssueAttachment` object.

#### `DELETE /issues/:id`
- **Purpose:** Deletes an issue and cascades to related attachments and notifications.
- **Auth:** Bearer Token (Owner or Admin/Supervisor).
- **Side Effects:** Emits `issue:deleted` with `issueId` via WebSocket.

---

### 1.3 Users & Teams (`/users`)

#### `POST /users`
- **Purpose:** Provisions a new user and creates a direct report relationship.
- **Auth:** Bearer Token (`SUPERVISOR`, `ADMIN`, `STAFF`).
- **Request Body:**
  ```json
  {
    "name": "Alex Smith",
    "email": "alex@example.com",
    "password": "password123",
    "role": "STAFF",
    "designation": "COORDINATOR",
    "reportingManagerId": "optional-uuid"
  }
  ```

#### `GET /users/team`
- **Purpose:** Lists team members. Returns all for Supervisors/Admins; direct subordinates for Staff.
- **Auth:** Bearer Token.

#### `GET /users/hierarchy`
- **Purpose:** Returns subordinate reporting relationships tree.
- **Auth:** Bearer Token.

---

### 1.4 Communications & Calls (`/calls`)

#### `POST /calls/initiate`
- **Purpose:** Logs call initiation and rings recipient via WebSocket.
- **Request Body:**
  ```json
  {
    "recipientId": "uuid",
    "callType": "video"
  }
  ```

#### `PATCH /calls/:id/status`
- **Purpose:** Updates call state (`ACCEPTED`, `REJECTED`, `MISSED`, `ENDED`).
- **Request Body:**
  ```json
  { "status": "ACCEPTED" }
  ```

#### `GET /calls`
- **Purpose:** Retrieves user call log.

---

### 1.5 Notifications (`/notifications`)

#### `GET /notifications`
- **Purpose:** Fetches last 50 notifications for the authenticated user.

#### `PATCH /notifications/:id/read`
- **Purpose:** Marks a notification as read (`isRead: true`, `readAt: now()`).

---

## 2. WebSocket Events (`RealtimeGateway`)

Connect URL: `ws://<API_URL>`  
Handshake Header: `Authorization: Bearer <TOKEN>`

### 2.1 Inbound Events (Client -> Server)

| Event Name | Payload | Handler & Behavior |
| :--- | :--- | :--- |
| `location:update` | `{ lat: number, lng: number, accuracy?: number }` | Relays location to `managers_of:<userId>` and `all_locations`. Appends to `LocationHistory`. |
| `call:signal` | `{ targetUserId: string, signal: any }` | Relays WebRTC SDP offer/answer or ICE candidates to `user:<targetUserId>`. |
| `call:accept` | `{ callerId: string }` | Relays call acceptance to `user:<callerId>`. |
| `call:reject` | `{ callerId: string }` | Relays call rejection to `user:<callerId>`. |

### 2.2 Outbound Events (Server -> Client)

| Event Name | Target Room / Client | Payload | Trigger |
| :--- | :--- | :--- | :--- |
| `issue:new` | Broadcast (all) | `Issue` object | When an issue is created. |
| `issue:updated`| Broadcast (all) | `Issue` object | When status or priority changes, or ticket escalates. |
| `issue:deleted`| Broadcast (all) | `issueId: string` | When an issue is deleted. |
| `location:update` | `managers_of:<id>`, `all_locations` | `{ userId, lat, lng, timestamp }` | Field staff GPS update. |
| `notification:new` | `user:<recipientId>` | `Notification` object | Task assignment or 2-hr SLA escalation. |
| `call:incoming` | `user:<recipientId>` | `{ callId, callType, caller: { id, name } }` | When a call is initiated. |
| `call:accepted` | `user:<callerId>` | `{ responderId }` | Callee accepted the call. |
| `call:rejected` | `user:<callerId>` | `{ responderId }` | Callee rejected the call. |
