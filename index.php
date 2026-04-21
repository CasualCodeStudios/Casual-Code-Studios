<?php
/**
 * ============================================================
 * CASUAL CODE STUDIOS — PHP BACKEND API
 * File: api/index.php
 * 
 * HOW THE FRONTEND CONNECTS TO THIS BACKEND:
 * ─────────────────────────────────────────────────────────────
 * The frontend (app.js) sends fetch() POST requests to this
 * file with a JSON body containing { "action": "..." }.
 * 
 * Example from app.js:
 *   const res = await fetch('api/index.php', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ action: 'login', email, password })
 *   });
 *   const data = await res.json();
 *
 * Routing is done via the `action` field in the JSON body.
 * All responses are JSON with at minimum { success: bool }.
 *
 * DATABASE:
 * Uses SQLite via PDO so no MySQL setup needed.
 * The DB file is stored at: api/data/ccs.db
 * ============================================================
 */

// ─── SECTION 1: HEADERS & CORS ───────────────────────────────
// Allow requests from the frontend origin.
// In production, replace * with your actual domain.
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS requests (CORS handshake)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ─── SECTION 2: DATABASE SETUP ───────────────────────────────
// We use SQLite for easy deployment — no MySQL needed.
// The DB file is auto-created on first run.
define('DB_PATH', __DIR__ . '/data/ccs.db');

if (!is_dir(__DIR__ . '/data')) {
    mkdir(__DIR__ . '/data', 0755, true);
}

function getDB(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;

    $pdo = new PDO('sqlite:' . DB_PATH);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    // Enable WAL mode for concurrent reads
    $pdo->exec('PRAGMA journal_mode=WAL;');

    // Create all tables if they don't exist yet
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            name      TEXT NOT NULL,
            email     TEXT UNIQUE NOT NULL,
            password  TEXT NOT NULL,           -- hashed with password_hash()
            role      TEXT DEFAULT 'member',   -- 'member' | 'vip' | 'admin'
            vip       INTEGER DEFAULT 0,       -- 0=no, 1=yes
            join_date TEXT DEFAULT (datetime('now')),
            avatar    TEXT DEFAULT ''          -- base64 data URL or file path
        );

        CREATE TABLE IF NOT EXISTS vip_codes (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            code     TEXT UNIQUE NOT NULL,
            used     INTEGER DEFAULT 0,
            used_by  TEXT DEFAULT '',          -- email of user who redeemed it
            created  TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS posts (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            title      TEXT NOT NULL,
            excerpt    TEXT DEFAULT '',
            content    TEXT DEFAULT '',
            category   TEXT DEFAULT 'tutorial',
            cat_label  TEXT DEFAULT 'Tutorial',
            tags       TEXT DEFAULT '',        -- comma-separated
            author     TEXT DEFAULT 'CCS Team',
            access     TEXT DEFAULT 'members', -- 'public' | 'members'
            read_time  TEXT DEFAULT '5 min read',
            created    TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS inquiries (
            id      INTEGER PRIMARY KEY AUTOINCREMENT,
            name    TEXT NOT NULL,
            contact TEXT DEFAULT '',            -- email or WhatsApp
            service TEXT DEFAULT '',
            message TEXT DEFAULT '',
            date    TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS course_access (
            user_email TEXT NOT NULL,
            granted_by TEXT DEFAULT 'admin',   -- admin email who granted
            granted_at TEXT DEFAULT (datetime('now')),
            PRIMARY KEY (user_email)
        );

        CREATE TABLE IF NOT EXISTS sessions (
            token      TEXT PRIMARY KEY,
            user_id    INTEGER NOT NULL,
            role       TEXT DEFAULT 'member',
            created_at TEXT DEFAULT (datetime('now')),
            expires_at TEXT NOT NULL
        );
    ");

    return $pdo;
}


// ─── SECTION 3: HELPER FUNCTIONS ─────────────────────────────

/** Return a JSON response and exit */
function respond(array $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data);
    exit();
}

/** Return a JSON error and exit */
function error(string $message, int $code = 400): void {
    respond(['success' => false, 'error' => $message], $code);
}

/** Generate a secure random token */
function generateToken(int $length = 64): string {
    return bin2hex(random_bytes($length / 2));
}

/** Create a session token for a user. Returns the token string. */
function createSession(int $userId, string $role): string {
    $db = getDB();
    $token = generateToken();
    // Sessions expire in 7 days
    $expires = date('Y-m-d H:i:s', strtotime('+7 days'));
    $stmt = $db->prepare('INSERT INTO sessions (token, user_id, role, expires_at) VALUES (?, ?, ?, ?)');
    $stmt->execute([$token, $userId, $role, $expires]);
    return $token;
}

/** Validate a session token from the Authorization header. Returns user array or null. */
function getAuthUser(): ?array {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!str_starts_with($header, 'Bearer ')) return null;

    $token = substr($header, 7);
    $db = getDB();

    $stmt = $db->prepare("
        SELECT u.*, s.role as session_role
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ? AND s.expires_at > datetime('now')
    ");
    $stmt->execute([$token]);
    return $stmt->fetch() ?: null;
}

/** Require a valid session, optionally check role */
function requireAuth(string $minRole = 'member'): array {
    $user = getAuthUser();
    if (!$user) error('Unauthorized — please log in.', 401);

    $roles = ['member' => 1, 'vip' => 2, 'admin' => 3];
    $userLevel  = $roles[$user['role']] ?? 1;
    $minLevel   = $roles[$minRole] ?? 1;

    if ($userLevel < $minLevel) error('Forbidden — insufficient permissions.', 403);
    return $user;
}

/** Sanitize a string to prevent XSS */
function clean(string $str): string {
    return htmlspecialchars(trim($str), ENT_QUOTES, 'UTF-8');
}


// ─── SECTION 4: REQUEST PARSING ──────────────────────────────
// Read the JSON body sent by the frontend fetch() call
$raw  = file_get_contents('php://input');
$body = json_decode($raw, true) ?? [];

// Also accept form-encoded data as fallback
if (empty($body) && !empty($_POST)) {
    $body = $_POST;
}

$action = $body['action'] ?? ($_GET['action'] ?? '');

if (!$action) {
    respond(['success' => true, 'message' => 'CCS API v1.0 — Casual Code Studios Backend']);
}


// ─── SECTION 5: ROUTE DISPATCHER ─────────────────────────────
// Each action maps to a handler function below.
// Frontend sends: { action: 'login', ...fields }

try {
    $db = getDB();

    switch ($action) {

        // ══════════════════════════════════════════════════════
        // AUTH ROUTES
        // Frontend connection: app.js → Auth.login() → fetch('api/index.php', { action: 'login' })
        // ══════════════════════════════════════════════════════

        case 'register':
            /**
             * FRONTEND USAGE (app.js):
             *   fetch('api/index.php', {
             *     method: 'POST',
             *     body: JSON.stringify({ action: 'register', name, email, password })
             *   })
             * RETURNS: { success, token, user }
             */
            $name     = clean($body['name'] ?? '');
            $email    = strtolower(trim($body['email'] ?? ''));
            $password = $body['password'] ?? '';

            if (!$name || !$email || !$password) error('All fields are required.');
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) error('Invalid email address.');
            if (strlen($password) < 6) error('Password must be at least 6 characters.');

            // Check if email already exists
            $exists = $db->prepare('SELECT id FROM users WHERE email = ?');
            $exists->execute([$email]);
            if ($exists->fetch()) error('An account with this email already exists.', 409);

            // Hash password — NEVER store plain text
            $hash = password_hash($password, PASSWORD_BCRYPT);

            $insert = $db->prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)');
            $insert->execute([$name, $email, $hash, 'member']);
            $userId = $db->lastInsertId();

            $token = createSession($userId, 'member');
            respond([
                'success' => true,
                'token'   => $token,
                'user'    => ['id' => $userId, 'name' => $name, 'email' => $email, 'role' => 'member', 'vip' => false]
            ]);
            break;


        case 'login':
            /**
             * FRONTEND USAGE (app.js):
             *   fetch('api/index.php', {
             *     method: 'POST',
             *     body: JSON.stringify({ action: 'login', email, password })
             *   })
             * RETURNS: { success, token, user }
             */
            $email    = strtolower(trim($body['email'] ?? ''));
            $password = $body['password'] ?? '';

            if (!$email || !$password) error('Email and password are required.');

            $stmt = $db->prepare('SELECT * FROM users WHERE email = ?');
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            // Verify password using PHP's built-in timing-safe comparison
            if (!$user || !password_verify($password, $user['password'])) {
                error('Invalid email or password.', 401);
            }

            $token = createSession($user['id'], $user['role']);
            respond([
                'success' => true,
                'token'   => $token,
                'user'    => [
                    'id'    => $user['id'],
                    'name'  => $user['name'],
                    'email' => $user['email'],
                    'role'  => $user['role'],
                    'vip'   => (bool)$user['vip']
                ]
            ]);
            break;


        case 'admin_login':
            /**
             * FRONTEND USAGE (admin.js → adminLogin()):
             *   fetch('api/index.php', {
             *     method: 'POST',
             *     body: JSON.stringify({ action: 'admin_login', email, password })
             *   })
             * RETURNS: { success, token }
             * The admin token is stored in localStorage as 'ccs-admin-token'
             */
            $email    = strtolower(trim($body['email'] ?? ''));
            $password = $body['password'] ?? '';

            $stmt = $db->prepare("SELECT * FROM users WHERE email = ? AND role = 'admin'");
            $stmt->execute([$email]);
            $admin = $stmt->fetch();

            if (!$admin || !password_verify($password, $admin['password'])) {
                // Fallback for first-run before admin is in DB:
                // Default credentials: admin@ccs.com / ccs-admin-2026
                // (Change this immediately in production!)
                $defaultEmail = 'admin@ccs.com';
                $defaultPass  = 'ccs-admin-2026';
                if ($email !== $defaultEmail || $password !== $defaultPass) {
                    error('Invalid admin credentials.', 401);
                }
                // Create the admin user in DB on first login
                $hash = password_hash($password, PASSWORD_BCRYPT);
                $db->prepare('INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)')
                   ->execute(['Admin', $email, $hash, 'admin']);
                $stmt2 = $db->prepare("SELECT id FROM users WHERE email = ?");
                $stmt2->execute([$email]);
                $admin = $stmt2->fetch();
            }

            $token = createSession($admin['id'], 'admin');
            respond(['success' => true, 'token' => $token]);
            break;


        case 'logout':
            /**
             * FRONTEND USAGE: fetch('api/index.php', { action: 'logout' })
             * with Authorization: Bearer <token>
             * Deletes the session from the DB.
             */
            $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
            $token  = str_starts_with($header, 'Bearer ') ? substr($header, 7) : '';
            if ($token) {
                $db->prepare('DELETE FROM sessions WHERE token = ?')->execute([$token]);
            }
            respond(['success' => true]);
            break;


        case 'me':
            /**
             * FRONTEND USAGE: Called on page load to check session validity.
             * fetch('api/index.php', { action: 'me' }) with Authorization header
             * RETURNS: { success, user } or 401 if not logged in
             */
            $user = requireAuth();
            respond(['success' => true, 'user' => [
                'id'    => $user['id'],
                'name'  => $user['name'],
                'email' => $user['email'],
                'role'  => $user['role'],
                'vip'   => (bool)$user['vip']
            ]]);
            break;


        case 'apply_vip_code':
            /**
             * FRONTEND USAGE (app.js → VIP code form submit):
             *   fetch('api/index.php', { action: 'apply_vip_code', code })
             * Requires: Authorization header with user token
             * RETURNS: { success, message }
             */
            $user = requireAuth();
            $code = strtoupper(trim($body['code'] ?? ''));

            if (!$code) error('VIP code is required.');

            // Find unused code
            $stmt = $db->prepare("SELECT * FROM vip_codes WHERE code = ? AND used = 0");
            $stmt->execute([$code]);
            $vipCode = $stmt->fetch();

            if (!$vipCode) error('Invalid or already used VIP code.', 404);

            // Mark code as used
            $db->prepare("UPDATE vip_codes SET used = 1, used_by = ? WHERE code = ?")
               ->execute([$user['email'], $code]);

            // Upgrade user to VIP
            $db->prepare("UPDATE users SET role = 'vip', vip = 1 WHERE id = ?")
               ->execute([$user['id']]);

            respond(['success' => true, 'message' => 'VIP access activated! Welcome to the inner circle. ⭐']);
            break;


        // ══════════════════════════════════════════════════════
        // INQUIRY / HIRE FORM ROUTES
        // Frontend: hireForm submit → fetch('api/index.php', { action: 'submit_inquiry' })
        // ══════════════════════════════════════════════════════

        case 'submit_inquiry':
            /**
             * FRONTEND USAGE (app.js → hireForm submit listener):
             *   fetch('api/index.php', {
             *     body: JSON.stringify({ action: 'submit_inquiry', name, contact, service, message })
             *   })
             * RETURNS: { success, id }
             * No auth required — public form.
             */
            $name    = clean($body['name'] ?? '');
            $contact = clean($body['contact'] ?? '');
            $service = clean($body['service'] ?? '');
            $message = clean($body['message'] ?? '');

            if (!$name) error('Name is required.');

            $stmt = $db->prepare('INSERT INTO inquiries (name, contact, service, message) VALUES (?, ?, ?, ?)');
            $stmt->execute([$name, $contact, $service, $message]);

            respond(['success' => true, 'id' => $db->lastInsertId(), 'message' => 'Inquiry received! We\'ll get back to you within 24 hours. 🚀']);
            break;


        // ══════════════════════════════════════════════════════
        // BLOG POST ROUTES
        // ══════════════════════════════════════════════════════

        case 'get_posts':
            /**
             * FRONTEND USAGE (app.js → renderPosts()):
             *   fetch('api/index.php', { action: 'get_posts', category: 'all' })
             * RETURNS: { success, posts: [...] }
             * Public posts visible to all; members-only posts need auth.
             */
            $cat = $body['category'] ?? 'all';
            $user = getAuthUser(); // null if not logged in

            if ($cat === 'all') {
                $stmt = $db->query('SELECT * FROM posts ORDER BY created DESC');
            } else {
                $stmt = $db->prepare('SELECT * FROM posts WHERE category = ? ORDER BY created DESC');
                $stmt->execute([$cat]);
            }
            $posts = $stmt->fetchAll();

            // Redact content for non-members
            foreach ($posts as &$post) {
                $post['locked'] = false;
                if ($post['access'] === 'members' && !$user) {
                    $post['content'] = ''; // hide full content
                    $post['locked'] = true;
                }
            }

            respond(['success' => true, 'posts' => $posts]);
            break;


        case 'save_post':
            /**
             * ADMIN ONLY — FRONTEND USAGE (admin.js → savePost()):
             *   fetch('api/index.php', {
             *     body: JSON.stringify({ action: 'save_post', title, excerpt, content, ... })
             *   })
             *   with Authorization: Bearer <admin-token>
             * RETURNS: { success, post }
             */
            requireAuth('admin');
            $title    = clean($body['title'] ?? '');
            $excerpt  = clean($body['excerpt'] ?? '');
            $content  = $body['content'] ?? ''; // allow HTML content
            $category = clean($body['category'] ?? 'tutorial');
            $catLabel = clean($body['cat_label'] ?? 'Tutorial');
            $tags     = clean($body['tags'] ?? '');
            $author   = clean($body['author'] ?? 'CCS Team');
            $access   = in_array($body['access'] ?? '', ['public','members']) ? $body['access'] : 'members';
            $readTime = clean($body['read_time'] ?? '5 min read');

            if (!$title) error('Post title is required.');

            $stmt = $db->prepare('INSERT INTO posts (title, excerpt, content, category, cat_label, tags, author, access, read_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $stmt->execute([$title, $excerpt, $content, $category, $catLabel, $tags, $author, $access, $readTime]);

            respond(['success' => true, 'id' => $db->lastInsertId(), 'message' => 'Post published! 🚀']);
            break;


        case 'delete_post':
            requireAuth('admin');
            $id = (int)($body['id'] ?? 0);
            if (!$id) error('Post ID required.');
            $db->prepare('DELETE FROM posts WHERE id = ?')->execute([$id]);
            respond(['success' => true]);
            break;


        // ══════════════════════════════════════════════════════
        // ADMIN — MEMBER MANAGEMENT
        // Frontend: admin.js → loadMembersList(), makeVipAdmin(), removeMemberAdmin()
        // ══════════════════════════════════════════════════════

        case 'get_members':
            requireAuth('admin');
            $members = $db->query("SELECT id, name, email, role, vip, join_date FROM users WHERE role != 'admin' ORDER BY join_date DESC")->fetchAll();
            respond(['success' => true, 'members' => $members]);
            break;


        case 'add_member':
            requireAuth('admin');
            $name  = clean($body['name'] ?? '');
            $email = strtolower(trim($body['email'] ?? ''));
            $role  = in_array($body['role'] ?? '', ['member','vip']) ? $body['role'] : 'member';

            if (!$name || !$email) error('Name and email are required.');
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) error('Invalid email.');

            // Generate a temporary password the admin can share
            $tempPass = generateToken(8);
            $hash     = password_hash($tempPass, PASSWORD_BCRYPT);

            try {
                $db->prepare('INSERT INTO users (name, email, password, role, vip) VALUES (?, ?, ?, ?, ?)')
                   ->execute([$name, $email, $hash, $role, $role === 'vip' ? 1 : 0]);
            } catch (Exception $e) {
                error('A user with this email already exists.');
            }

            respond(['success' => true, 'temp_password' => $tempPass, 'message' => "Member added! Temp password: $tempPass"]);
            break;


        case 'make_vip':
            requireAuth('admin');
            $id = (int)($body['user_id'] ?? 0);
            if (!$id) error('User ID required.');
            $db->prepare("UPDATE users SET role = 'vip', vip = 1 WHERE id = ?")->execute([$id]);
            respond(['success' => true]);
            break;


        case 'remove_member':
            requireAuth('admin');
            $id = (int)($body['user_id'] ?? 0);
            if (!$id) error('User ID required.');
            $db->prepare("DELETE FROM users WHERE id = ? AND role != 'admin'")->execute([$id]);
            $db->prepare("DELETE FROM sessions WHERE user_id = ?")->execute([$id]);
            respond(['success' => true]);
            break;


        // ══════════════════════════════════════════════════════
        // ADMIN — VIP CODES
        // Frontend: admin.js → generateVipCode(), deleteVipCode()
        // ══════════════════════════════════════════════════════

        case 'generate_vip_code':
            requireAuth('admin');
            $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            do {
                $code = 'VIP' . implode('', array_map(fn() => $chars[random_int(0, strlen($chars)-1)], range(1,5)));
                $exists = $db->prepare('SELECT id FROM vip_codes WHERE code = ?');
                $exists->execute([$code]);
            } while ($exists->fetch()); // ensure uniqueness

            $db->prepare('INSERT INTO vip_codes (code) VALUES (?)')->execute([$code]);
            respond(['success' => true, 'code' => $code]);
            break;


        case 'get_vip_codes':
            requireAuth('admin');
            $codes = $db->query('SELECT * FROM vip_codes ORDER BY created DESC')->fetchAll();
            respond(['success' => true, 'codes' => $codes]);
            break;


        case 'delete_vip_code':
            requireAuth('admin');
            $code = strtoupper(trim($body['code'] ?? ''));
            if (!$code) error('Code required.');
            $db->prepare('DELETE FROM vip_codes WHERE code = ?')->execute([$code]);
            respond(['success' => true]);
            break;


        // ══════════════════════════════════════════════════════
        // ADMIN — INQUIRIES
        // Frontend: admin.js → loadInquiriesList()
        // ══════════════════════════════════════════════════════

        case 'get_inquiries':
            requireAuth('admin');
            $inquiries = $db->query('SELECT * FROM inquiries ORDER BY date DESC')->fetchAll();
            respond(['success' => true, 'inquiries' => $inquiries]);
            break;


        // ══════════════════════════════════════════════════════
        // ADMIN — OVERVIEW STATS
        // Frontend: admin.js → loadAdminData() calls this on dashboard load
        // ══════════════════════════════════════════════════════

        case 'get_stats':
            requireAuth('admin');
            $stats = [
                'total_members'  => $db->query("SELECT COUNT(*) FROM users WHERE role != 'admin'")->fetchColumn(),
                'total_vip'      => $db->query("SELECT COUNT(*) FROM users WHERE vip = 1")->fetchColumn(),
                'total_posts'    => $db->query("SELECT COUNT(*) FROM posts")->fetchColumn(),
                'total_inquiries'=> $db->query("SELECT COUNT(*) FROM inquiries")->fetchColumn(),
                'recent_members' => $db->query("SELECT name, email, join_date FROM users WHERE role != 'admin' ORDER BY join_date DESC LIMIT 5")->fetchAll(),
                'recent_inquiries'=> $db->query("SELECT name, contact, service, date FROM inquiries ORDER BY date DESC LIMIT 5")->fetchAll(),
            ];
            respond(['success' => true, 'stats' => $stats]);
            break;


        // ══════════════════════════════════════════════════════
        // COURSE ACCESS MANAGEMENT
        // Frontend: admin.js → grantCourseAccess(), revokeCourseAccess()
        // Course page: course.js → checkCourseAccess()
        // ══════════════════════════════════════════════════════

        case 'grant_course_access':
            /**
             * ADMIN ONLY — grants a user access to the HTML course.
             * Frontend (admin.js panel-courses): 
             *   fetch('api/index.php', { action: 'grant_course_access', user_email })
             */
            requireAuth('admin');
            $email = strtolower(trim($body['user_email'] ?? ''));
            if (!$email) error('User email required.');

            $db->prepare('INSERT OR REPLACE INTO course_access (user_email, granted_by) VALUES (?, ?)')
               ->execute([$email, 'admin']);
            respond(['success' => true, 'message' => "Course access granted to $email"]);
            break;


        case 'revoke_course_access':
            requireAuth('admin');
            $email = strtolower(trim($body['user_email'] ?? ''));
            $db->prepare('DELETE FROM course_access WHERE user_email = ?')->execute([$email]);
            respond(['success' => true]);
            break;


        case 'check_course_access':
            /**
             * Called by course.html on load via course.js:
             *   fetch('api/index.php', { action: 'check_course_access' })
             *   with Authorization: Bearer <user-token>
             * RETURNS: { success, has_access: bool }
             */
            $user = requireAuth('member');
            $email = $user['email'];

            // Admins and VIPs always have access
            if (in_array($user['role'], ['admin', 'vip'])) {
                respond(['success' => true, 'has_access' => true]);
            }

            $stmt = $db->prepare('SELECT user_email FROM course_access WHERE user_email = ?');
            $stmt->execute([$email]);
            respond(['success' => true, 'has_access' => (bool)$stmt->fetch()]);
            break;


        case 'get_course_access_list':
            requireAuth('admin');
            $list = $db->query('SELECT ca.user_email, ca.granted_at, u.name FROM course_access ca LEFT JOIN users u ON ca.user_email = u.email ORDER BY ca.granted_at DESC')->fetchAll();
            respond(['success' => true, 'list' => $list]);
            break;


        // ══════════════════════════════════════════════════════
        // ADMIN — SETTINGS
        // Frontend: admin.js → saveSettings()
        // ══════════════════════════════════════════════════════

        case 'save_settings':
            $admin = requireAuth('admin');
            $displayName = clean($body['display_name'] ?? 'Kongo Bonface');
            $oldPass     = $body['old_password'] ?? '';
            $newPass     = $body['new_password'] ?? '';

            if ($oldPass && $newPass) {
                if (strlen($newPass) < 6) error('New password must be at least 6 characters.');
                // Verify old password
                $stmt = $db->prepare('SELECT password FROM users WHERE id = ?');
                $stmt->execute([$admin['id']]);
                $dbPass = $stmt->fetchColumn();
                if (!password_verify($oldPass, $dbPass)) error('Current password is incorrect.', 401);
                // Update password
                $hash = password_hash($newPass, PASSWORD_BCRYPT);
                $db->prepare('UPDATE users SET password = ? WHERE id = ?')->execute([$hash, $admin['id']]);
            }

            if ($displayName) {
                $db->prepare('UPDATE users SET name = ? WHERE id = ?')->execute([$displayName, $admin['id']]);
            }

            respond(['success' => true, 'message' => 'Settings saved!']);
            break;


        default:
            error("Unknown action: '$action'", 404);
    }

} catch (PDOException $e) {
    // Log DB errors but don't expose details to client
    error_log('[CCS API DB Error] ' . $e->getMessage());
    error('A database error occurred. Please try again.', 500);
} catch (Exception $e) {
    error_log('[CCS API Error] ' . $e->getMessage());
    error('An unexpected error occurred.', 500);
}