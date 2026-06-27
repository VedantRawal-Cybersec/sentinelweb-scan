# Remediation Recommendations

## Immediate Actions

1. Force password reset for affected accounts, especially `admin`, `administrator`, `root`, and `itadmin`.
2. Review VPN logs for all sessions associated with `45.77.32.11` and `185.220.101.23`.
3. Block or rate-limit suspicious source IPs at the firewall, VPN, or identity provider level.
4. Validate whether the successful `admin` login was authorized.
5. Review post-login activity for signs of lateral movement, privilege escalation, or data access.

## Short-Term Controls

1. Enable MFA for VPN and all privileged accounts.
2. Configure account lockout after repeated failed attempts.
3. Create a Splunk alert for failed login bursts followed by success.
4. Monitor authentication attempts from unusual geolocations.
5. Add privileged account watchlists in the SIEM.

## Long-Term Improvements

1. Implement conditional access policies.
2. Enforce strong password policy and password reuse prevention.
3. Build a baseline of normal login behavior for users and IP ranges.
4. Add detection logic for password spraying and credential stuffing.
5. Map authentication detections to MITRE ATT&CK for SOC reporting.

## Suggested Splunk Alert Rule

Trigger an alert when the same `src_ip` has 20 or more failures followed by a successful login.

```spl
index=failed_login_lab
| sort 0 _time
| streamstats count(eval(action="failure")) as previous_failures by src_ip
| where action="success" AND previous_failures>=20
| table _time src_ip user dest_host app action previous_failures reason severity country
```
