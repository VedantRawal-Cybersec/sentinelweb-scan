# MITRE ATT&CK Mapping

## T1110 - Brute Force

**Observed behavior:** Repeated failed login attempts from the same source IPs.

**Evidence:** Source IP `45.77.32.11` generated 45 failed attempts and `185.220.101.23` generated 30 failed attempts.

**Why it applies:** Repeated authentication failures against multiple users are consistent with brute-force, credential stuffing, or password spraying behavior.

---

## T1078 - Valid Accounts

**Observed behavior:** A successful login occurred after a high number of previous failed attempts.

**Evidence:** Source IP `45.77.32.11` successfully logged in as `admin` to `vpn-gateway` after 45 previous failures.

**Why it applies:** A successful login after repeated failures may indicate that valid credentials were discovered or used.

---

## T1133 - External Remote Services

**Observed behavior:** The successful login targeted `vpn-gateway` through the `vpn` application.

**Why it applies:** VPN access can be abused by attackers to gain remote access into an environment using valid or compromised credentials.

---

## T1589 - Gather Victim Identity Information

**Observed behavior:** Multiple usernames were targeted by the same source IPs.

**Evidence:** `45.77.32.11` targeted 9 unique users and `185.220.101.23` targeted 6 unique users.

**Why it applies:** Targeting multiple accounts suggests possible username enumeration or credential-targeting activity.
