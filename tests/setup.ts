// Deterministic environment for unit tests: no real credentials, fixed
// locale and timezone so money and date formatting assertions are stable.
process.env.TZ = 'Asia/Dhaka';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';
