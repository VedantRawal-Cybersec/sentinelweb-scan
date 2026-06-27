# Splunk Failed Login & Brute-Force Detection Lab

> SOC-style authentication log investigation using Splunk Enterprise, SPL, MITRE ATT&CK mapping, and incident reporting.

## Project Summary

This lab simulates a Security Operations Center investigation of failed login activity. The objective was to analyze authentication logs, identify suspicious brute-force behavior, detect successful authentication after repeated failures, and document the incident in a recruiter-ready analyst report.

The investigation used a controlled lab dataset named `failed_login_lab` inside Splunk Enterprise. The lab is defensive and educational only.

## Key Outcome

A critical authentication pattern was detected:

- Source IP `45.77.32.11` generated **45 failed login attempts**.
- It targeted **9 unique user accounts** including `admin`, `administrator`, `backup`, `devops`, `oracle`, `postgres`, `root`, `test`, and `vedant`.
- A later successful login was observed for user `admin` on `vpn-gateway` after repeated failures.
- The event reason was `valid_password_after_failures`.
- Severity was classified as **Critical**.
- Mapped MITRE ATT&CK techniques: **T1110 Brute Force** and **T1078 Valid Accounts**.

## Tools Used

| Tool | Purpose |
|---|---|
| Splunk Enterprise | SIEM search, statistics, visualization, investigation |
| SPL | Detection queries and aggregation logic |
| MITRE ATT&CK | Attack behavior mapping |
| Authentication log dataset | Failed and successful login simulation |
| Analyst report | Incident documentation and remediation planning |

## Evidence Screenshots

| Screenshot | Description |
|---|---|
| `screenshots/01-raw-events-imported.png` | Raw authentication events imported into Splunk |
| `screenshots/02-blocked-failed-login-events.png` | Failed/blocked login activity search |
| `screenshots/03-failed-logins-by-source-ip.png` | Failed login count by source IP |
| `screenshots/04-failed-logins-by-user.png` | Failed login count by targeted user |
| `screenshots/05-suspicious-source-ips-targeted-users.png` | Suspicious IPs targeting many accounts |
| `screenshots/06-success-after-multiple-failures.png` | Successful login after repeated failures |
| `screenshots/07-failed-login-timeline.png` | Timechart visualization of failed logins |
| `screenshots/08-authentication-summary-statistics.png` | Total events, failed/successful logins, unique users/IPs |

## Main Findings

| Indicator | Finding |
|---|---|
| Total authentication events | 195 |
| Failed login events | 96 |
| Successful login events | 99 |
| Unique source IPs | 7 |
| Unique users | 20 |
| Top suspicious IP | `45.77.32.11` |
| Highest failed login count | 45 failures |
| Successful login after failures | Yes |
| Critical asset involved | `vpn-gateway` |
| High-risk user | `admin` |
| Severity | Critical |

## Detection Logic

The investigation focused on four detection questions:

1. Which IPs generated the highest failed login volume?
2. Which usernames were targeted the most?
3. Which source IPs targeted multiple user accounts?
4. Did any successful login occur after repeated failures from the same source IP?

Full SPL queries are available in [`spl_queries/splunk_queries.md`](spl_queries/splunk_queries.md).

## MITRE ATT&CK Mapping

| Technique ID | Technique | Why It Applies |
|---|---|---|
| T1110 | Brute Force | Multiple repeated failed login attempts were observed from the same source IPs. |
| T1078 | Valid Accounts | A successful login occurred after repeated failures, suggesting possible credential compromise. |
| T1133 | External Remote Services | VPN gateway authentication was involved, indicating possible remote access abuse. |
| T1589 | Gather Victim Identity Information | Multiple usernames were targeted, suggesting user enumeration or credential targeting. |

Detailed mapping is available in [`docs/mitre_mapping.md`](docs/mitre_mapping.md).

## Business Impact

If this were a real environment, the activity could indicate:

- Possible brute-force attack against VPN authentication.
- Account takeover risk for privileged or commonly targeted accounts.
- Unauthorized remote access through valid credentials.
- Increased lateral movement risk after VPN compromise.
- Weak password policy or missing MFA control.

## Recommended Response Actions

1. Force password reset for affected accounts.
2. Enable MFA for VPN and privileged accounts.
3. Block or rate-limit suspicious source IPs.
4. Review VPN logs for post-authentication activity.
5. Create SIEM alert rule for repeated failures followed by success.
6. Monitor privileged accounts such as `admin`, `administrator`, `root`, and `itadmin`.
7. Enforce account lockout and geo-anomaly detection.

Full remediation guidance is available in [`docs/remediation.md`](docs/remediation.md).

## Report

The complete incident report is available here:

- [`reports/Splunk_Failed_Login_Brute_Force_Detection_Report.pdf`](reports/Splunk_Failed_Login_Brute_Force_Detection_Report.pdf)
- [`reports/incident_report.md`](reports/incident_report.md)

## Resume Bullet

Built a Splunk-based SOC investigation lab to detect brute-force authentication behavior, analyze failed login trends, identify successful login after repeated failures, map findings to MITRE ATT&CK, and produce an incident report with remediation recommendations.

## LinkedIn Project Description

This project demonstrates hands-on SOC analysis using Splunk Enterprise. I investigated authentication logs, detected brute-force patterns, identified a successful login after repeated failures, mapped the behavior to MITRE ATT&CK, and documented the incident with business impact and remediation steps.

## Ethical Usage

This project is based on a controlled lab dataset and is intended only for defensive cybersecurity learning, SOC analysis practice, and portfolio demonstration. Do not perform testing, scanning, or authentication attacks against systems you do not own or do not have explicit permission to test.
