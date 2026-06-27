# Splunk SPL Queries - Failed Login & Brute-Force Detection Lab

## 1. Base Search - All Imported Authentication Events

```spl
source="splunk_failed_login_lab (1).csv" host="ABHAY" index="failed_login_lab" sourcetype="csv"
```

Purpose: Validate that the dataset was imported correctly and review raw authentication events.

---

## 2. Authentication Summary Statistics

```spl
index=failed_login_lab
| stats count as total_events,
        count(eval(action="failure")) as failed_logins,
        count(eval(action="success")) as successful_logins,
        dc(src_ip) as unique_source_ips,
        dc(user) as unique_users
```

Purpose: Create a high-level summary of authentication activity.

Observed result:

- Total events: 195
- Failed logins: 96
- Successful logins: 99
- Unique source IPs: 7
- Unique users: 20

---

## 3. Failed Logins by Source IP

```spl
index=failed_login_lab action=failure
| stats count by src_ip
| sort - count
```

Purpose: Identify source IPs generating the highest failed login volume.

Top findings:

| Source IP | Failed Login Count |
|---|---:|
| 45.77.32.11 | 45 |
| 185.220.101.23 | 30 |
| 10.10.5.23 | 6 |
| 10.10.5.22 | 4 |
| 10.10.5.24 | 4 |
| 10.10.5.25 | 4 |
| 10.10.5.21 | 3 |

---

## 4. Failed Logins by Targeted User

```spl
index=failed_login_lab action=failure
| stats count by user
| sort - count
```

Purpose: Identify the most frequently targeted accounts.

Visible top findings:

| User | Failed Login Count |
|---|---:|
| administrator | 15 |
| admin | 9 |
| itadmin | 7 |
| vedant | 7 |
| backup | 6 |
| oracle | 6 |
| test | 6 |
| root | 5 |
| arjun | 4 |
| finance | 4 |
| priya | 4 |

---

## 5. Suspicious IPs Targeting Multiple Users

```spl
index=failed_login_lab action=failure
| stats count dc(user) as unique_users values(user) as targeted_users by src_ip
| where count > 20 OR unique_users > 5
| sort - count
```

Purpose: Detect possible password spraying, brute-force, or credential stuffing behavior.

Findings:

| Source IP | Failed Count | Unique Users | Targeted Users |
|---|---:|---:|---|
| 45.77.32.11 | 45 | 9 | admin, administrator, backup, devops, oracle, postgres, root, test, vedant |
| 185.220.101.23 | 30 | 6 | admin, administrator, finance, hr, itadmin, support |

---

## 6. Successful Login After Multiple Failed Attempts

```spl
index=failed_login_lab
| sort 0 _time
| streamstats count(eval(action="failure")) as previous_failures by src_ip
| where action="success" AND previous_failures>=20
| table _time src_ip user dest_host app action previous_failures reason severity country
```

Purpose: Detect a high-risk pattern where an IP succeeds after multiple failed attempts.

Critical finding:

| Time | Source IP | User | Asset | App | Previous Failures | Reason | Severity | Country |
|---|---|---|---|---|---:|---|---|---|
| 2026-06-26 11:50:00.450 | 45.77.32.11 | admin | vpn-gateway | vpn | 45 | valid_password_after_failures | critical | Netherlands |

---

## 7. Failed Login Timeline by Source IP

```spl
index=failed_login_lab action=failure
| timechart span=10m count by src_ip
```

Purpose: Visualize failed login bursts over time and identify concentrated attack windows.

---

## 8. Blocked Failed Login Events

```spl
index="failed_login_lab" action="failure" blocked
```

Purpose: Review blocked failed authentication events and inspect raw evidence such as user, host, app, country, reason, severity, and authentication source.
