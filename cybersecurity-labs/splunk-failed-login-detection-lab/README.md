# Splunk SOC Authentication Analysis Lab

Recruiter-ready SOC lab using Splunk Enterprise, SPL, MITRE ATT&CK mapping, and incident reporting.

## Included Files

- [SPL Queries](spl_queries/splunk_queries.md)
- [Incident Report - Markdown](reports/incident_report.md)
- [Incident Report - PDF](reports/Splunk_Failed_Login_Brute_Force_Detection_Report.pdf)
- [MITRE Mapping](docs/mitre_mapping.md)
- [Remediation Notes](docs/remediation.md)

## Visual Evidence

- [Authentication Summary](screenshots/08-authentication-summary-statistics.svg)
- [Source IP Analysis](screenshots/03-failed-logins-by-source-ip.svg)
- [Multi-Account Targeting Analysis](screenshots/05-suspicious-source-ips-targeted-users.svg)
- [Critical Authentication Pattern](screenshots/06-success-after-multiple-failures.svg)

## Key Finding

The lab identified a high-risk authentication pattern involving repeated failed login activity, multiple targeted accounts, and a later successful VPN login. The event was documented with SPL queries, findings, MITRE mapping, business impact, and remediation actions.

## Skills Demonstrated

- Splunk SIEM analysis
- SPL query writing
- Authentication log investigation
- SOC-style incident reporting
- MITRE ATT&CK mapping
- Security remediation planning

## Resume Bullet

Built a Splunk-based SOC investigation lab to analyze authentication logs, identify suspicious login behavior, map findings to MITRE ATT&CK, and produce a structured incident report with remediation recommendations.
