# Incident Report - Possible Brute-Force Login Followed by Successful Authentication

## Executive Summary

A Splunk-based authentication log investigation identified a critical suspicious login pattern. Source IP `45.77.32.11` generated 45 failed login attempts, targeted 9 unique accounts, and later produced a successful login for user `admin` on `vpn-gateway`. This pattern may indicate brute-force success, password spraying, credential stuffing, or use of valid compromised credentials.

## Incident Details

| Field | Value |
|---|---|
| Incident Type | Brute-force / suspicious authentication activity |
| Severity | Critical |
| Primary Source IP | 45.77.32.11 |
| Secondary Source IP | 185.220.101.23 |
| Affected User | admin |
| Affected Asset | vpn-gateway |
| Application | vpn |
| Country | Netherlands |
| Reason | valid_password_after_failures |
| Detection Tool | Splunk Enterprise |

## Evidence Summary

- 195 total authentication events were reviewed.
- 96 failed login events were identified.
- 99 successful login events were identified.
- 7 unique source IPs and 20 unique users were observed.
- `45.77.32.11` generated 45 failed login attempts.
- `185.220.101.23` generated 30 failed login attempts.
- `45.77.32.11` targeted 9 unique users.
- A successful login occurred from `45.77.32.11` after 45 previous failures.

## MITRE ATT&CK Mapping

| Technique | Name | Relevance |
|---|---|---|
| T1110 | Brute Force | Multiple failed login attempts from same source IPs |
| T1078 | Valid Accounts | Successful login after repeated failures |
| T1133 | External Remote Services | VPN gateway involved |
| T1589 | Gather Victim Identity Information | Multiple users targeted |

## Analyst Assessment

The source IP `45.77.32.11` showed high-volume failed authentication behavior across multiple accounts. The later successful login to the VPN gateway using the `admin` account increases the severity because it may indicate credential compromise or a successful brute-force attempt.

Confidence: High
Severity: Critical
Priority: Immediate review required

## Recommended Actions

1. Confirm whether the `admin` login was authorized.
2. Force password reset for targeted users.
3. Enable or enforce MFA for VPN authentication.
4. Block or rate-limit suspicious IP addresses.
5. Investigate post-authentication activity from the source IP.
6. Review endpoint, VPN, and identity provider logs.
7. Create a Splunk alert for repeated failures followed by success.

## Detection Query

```spl
index=failed_login_lab
| sort 0 _time
| streamstats count(eval(action="failure")) as previous_failures by src_ip
| where action="success" AND previous_failures>=20
| table _time src_ip user dest_host app action previous_failures reason severity country
```

## Conclusion

The observed pattern represents a high-risk authentication event. A successful VPN login after repeated failed attempts should be treated as a potential account compromise until verified. This lab demonstrates SOC-style log analysis, threat detection, MITRE ATT&CK mapping, and incident reporting using Splunk Enterprise.
