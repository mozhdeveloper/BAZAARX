

Business Rules for
BazaarX Ver. 1

Note: Temporary BRD for Email and SMS Automation; Can still be updated




































Module 1 - Email & SMS Automation
The Email & SMS Automation Module governs the creation, triggering, delivery, monitoring, and compliance of all
system-generated communications within the e-commerce platform.
This module ensures:
a. Timely transactional notifications
b. Secure delivery of authentication messages
c. Controlled execution of marketing campaigns
d. Regulatory compliance with data privacy and anti-spam laws
e. Proper audit logging and traceability
f. Prevention of communication abuse or system misuse
The module applies to both customer-facing and system-generated notifications across Email and SMS channels.
## Controller Assignment
This section defines the designated role or authority responsible for governing, executing, monitoring, and
enforcing each automation rule within the Email & SMS Automation module.

## Section Section Title Primary
## Controller
## Secondary
## Controller
## Rationale
## A Rule Classification
## & Communication
## Governance
## Platform System
(Core Logic)
Super Admin (Policy
## Configuration)
Classification, consent
enforcement, quiet hours,
and frequency limits must
be system-enforced to
prevent compliance risk.
Admin may configure
thresholds but cannot
bypass logic.
## B Transactional
## Automation Rules
## Platform System None
(Non-Overridable)
Order, payment, shipment,
and refund notifications
are operationally
mandatory and must not
be manually controlled or
disabled by sellers.

C OTP & Security
## Rules
Platform System Super Admin (Security
## Policy Settings)
OTP expiry and rate
limiting are security
controls and must be
system-managed. Admin
may configure expiry
duration and retry limits
but cannot manually
trigger or bypass
validation.
## D Template
## Governance &
## Content Control
## Super Admin
(Marketing/Admin
## Team)
## Platform System
(Approval
## Enforcement)
Templates require human
governance for branding
and legal compliance. The
system enforces approval
workflow and prevents
unapproved usage.
## E Delivery & Failure
## Handling
Platform System DevOps / Technical
Admin (Monitoring)
Retry logic, bounce
suppression, and queuing
must be automated.
Technical teams monitor
delivery infrastructure but
do not manually trigger
retries.
## F Logging, Audit &
## Compliance
Platform System Compliance/Admin
(Review Access)
Logging must be
automatically enforced.
Admin and Compliance
teams may review logs
but cannot alter historical
records.



## A. Rule Classification
This section defines how communications are categorized, controlled, and governed before being sent. It
establishes consent enforcement, marketing limitations, and message classification standards.

## Rule
## ID
## Rule Title Rule
## Statement
Trigger/Eve
nt
## Conditions System
## Enforcement
## Applicable
## Channel

## BR-E
## MA-0
## 01
## Communication
## Categorization
All outgoing
communicati
ons shall be
classified as
## Transactional,
Security, or
## Marketing
prior to
dispatch.
## Message
creation
## Category
field is
required
System shall block
dispatch if
category is null or
invalid.
## Email
## BR-E
## MA-0
## 02
## Mandatory
## Transactional
## Delivery
## Transactional
communicati
ons shall be
delivered
regardless of
marketing
consent
status.
## Transactional
event
## Event
successfully
recorded
System shall
bypass marketing
suppression logic.
## Email
## BR-E
## MA-0
## 03
## Marketing
## Consent
## Requirement
## Marketing
communicati
ons shall only
be sent to
users with
recorded
explicit
consent.
## Campaign
execution
User consent
## = Active
System shall
suppress
communication if
consent is inactive
or revoked.
## Email
## BR-E
## MA-0
## 04
## Unsubscribe
## Enforcement
Users shall be
able to revoke
marketing
consent at
any time.
## Unsubscribe
action
Valid user
identity
System shall
immediately
update consent
status and
suppress future
marketing
communications.
## Email
## BR-E
## MA-0
## 05
## Quiet Hours
## Restriction
## Marketing
communicati
ons shall not
be delivered
between
21:00 and
08:00 based
## Campaign
dispatch
## Marketing
classification
System shall defer
delivery until
permissible hours.
## Email

on user
timezone.
## BR-E
## MA-0
## 06
## Frequency
## Limitation
## Marketing
communicati
ons shall not
exceed
defined
weekly
thresholds.
## Campaign
scheduling
## Email ≤
3/week; SMS
## ≤ 2/week
System shall block
dispatch if
threshold
exceeded.
## Email


## B. Transactional Automation Rules
This section defines mandatory automated notifications triggered by order lifecycle events and financial
transactions. These notifications are critical for order transparency, payment confirmation, and operational
trust.

## Rule
## ID
## Rule Title Rule
## Statement
Trigger/Event Conditions System
## Enforcement
## Applicable
## Channel
## BR-E
## MA-0
## 07
## Order
## Confirmation
## Notification
## Order
confirmation
notification
shall be sent
upon
successful
order
creation.
Order created Payment
status =
Pending or
## Paid
System shall
send notification
within 60
seconds.
## Email
## BR-E
## MA-0
## 08
## Payment
## Confirmation
## Notification
## Payment
confirmation
shall be sent
upon
successful
payment
verification.
## Payment
verified
## Payment
status =
## Completed
System shall
send notification
immediately.
## Email
## BR-E
## MA-0
## 09
## Shipment
## Notification
## Shipment
notification
shall be sent
when order
status
Status update Tracking
number
available
System shall
include tracking
details in
communication.
## Email

changes to
## Shipped.
## BR-E
## MA-0
## 10
## Delivery
## Notification
## Delivery
confirmation
shall be sent
upon
confirmed
delivery.
Status update Delivery
confirmed
System shall
notify customer
immediately.
## Email,
## SMS
## (optional)
## BR-E
## MA-0
## 11
## Refund
## Notification
## Refund
confirmation
shall be sent
once refund is
processed.
## Refund
processed
## Refund
status =
## Completed
System shall
send notification
without delay.
## Email,
## SMS
## BR-E
## MA-0
## 12
## Security
## Notification
## Security
alerts shall be
sent
immediately
upon
detection of
security
events.
## Password
reset,
suspicious
login
## Security
event
validated
System shall
prioritize
dispatch without
delay.
## Email,
## SMS


C. OTP & Security Rules
This section governs the issuance, validity, and protection of One-Time Passwords (OTP) and
security-related communications to ensure user authentication integrity and fraud prevention.

## Rule
## ID
## Rule Title Rule
## Statement
Trigger/Event Conditions System
## Enforcement
## Applicable
## Channel
## BR-E
## MA-0
## 13
## OTP
## Validity
One-Time
## Password
(OTP) shall
expire within
five (5)
minutes from
generation.
OTP generated Valid
phone/email
System shall
invalidate OTP
after expiration
time.
## SMS,
## Email

## BR-E
## MA-0
## 14
OTP Retry
## Limitation
OTP requests
shall be
limited to
prevent abuse.
OTP request Maximum 5
attempts per
hour
System shall
temporarily
block further
requests upon
limit breach.
## SMS,
## Email


## D. Template Governance & Content Control
This section establishes content governance standards, template approval requirements, version control,
personalization validation, and legal compliance requirements for outbound communications.

## Rule
## ID
Rule Title Rule Statement Trigger/Event Conditions System
## Enforcement
## Applicable
## Channel
## BR-E
## MA-0
## 15
## Template
## Approval
## Requirement
All templates
must be
approved prior
to activation.
## Template
creation/edit
## Status =
## Approved
by Admin
System shall
prevent use
of draft or
unapproved
templates.
## Email,
## SMS
## BR-E
## MA-0
## 16
## Template
## Version
## Control
## Template
modifications
shall create a
new version
record.
## Template
update
## Existing
live
template
System shall
preserve
historical
versions.
## Email,
## SMS
## BR-E
## MA-0
## 17
## Personalization
## Validation
## Dynamic
variables must
be validated
before message
dispatch.
## Message
generation
## Required
fields
populated
System shall
block
dispatch if
required
variables are
missing.
## Email
## BR-E
## MA-0
## 18
## Legal Footer
## Inclusion
## Marketing
communications
shall include
unsubscribe
mechanism and
legal disclosure.
## Marketing
send
## Message
classified
as
## Marketing
System shall
append
mandatory
footer.
## Email



## E. Delivery & Failure Handling
This section defines retry mechanisms, bounce suppression rules, queue management during downtime,
and delivery assurance protocols to maintain communication reliability.

## Rule
## ID
## Rule Title Rule
## Statement
Trigger/Event Conditions System
## Enforcement
## Applicable
## Channel
## BR-E
## MA-0
## 19
## Email Retry
## Logic
Failed email
deliveries
shall be
retried up to
three (3)
times.
## Delivery
failure
## Provider
response =
## Failed
System shall
attempt retries
before marking
failure.
## Email
## BR-E
## MA-0
## 20
SMS Retry
## Logic
Failed SMS
deliveries
shall be
retried once.
## Delivery
failure
## Provider
response =
## Failed
System shall
attempt one retry
only.
## SMS
## BR-E
## MA-0
## 21
## Bounce
## Suppression
Contacts with
three (3)
consecutive
hard bounces
shall be
marked
invalid.
## Bounce
detected
## Bounce
threshold
reached
System shall
suppress future
communications.
## Email
## BR-E
## MA-0
## 22
## Queue
## During
## Downtime
## Messages
generated
during
service
downtime
shall be
queued.
## Automation
service
unavailable
## System
outage
detected
System shall
dispatch queued
messages upon
recovery.
## Email,
## SMS


## F. Logging, Audit & Compliance
This section ensures transparency, traceability, performance monitoring, regulatory alignment, and record
retention for all automated communications.

## Rule
## ID
Rule Title Rule Statement Trigger/Event Conditions System
## Enforcement
## Applicable
## Channel

## BR-E
## MA-0
## 23
## Communicatio
n Logging
All outgoing
communications
shall be logged.
Message sent Valid send
attempt
System shall
log recipient,
timestamp,
template ID,
delivery
status.
## Email,
## SMS
## BR-E
## MA-0
## 24
## Log Retention Communication
logs shall be
retained for
minimum
twelve (12)
months.
Log storage Log
created
System shall
enforce
retention
policy.
## Email,
## SMS
## BR-E
## MA-0
## 25
## Data Privacy
## Compliance
## Communication
s shall comply
with applicable
data protection
and anti-spam
regulations.
Any dispatch User data
processed
System shall
enforce
consent
tracking and
data security
standards.
## Email,
## SMS
## BR-E
## MA-0
## 26
## Performance
## Monitoring
## Campaign
performance
metrics shall be
recorded and
reportable.
## Campaign
execution
## Valid
campaign
## ID
System shall
track open
rate, click
rate,
unsubscribe
rate, and
delivery rate.
## Email

## G. Contact Validation
This section ensures that all contact information is validated prior to message dispatch to prevent
unnecessary delivery failures and protect sender reputation.

## Rule
## ID
## Rule Title Rule
## Statement
Trigger/Event Conditions System
## Enforcement
## Applicable
## Channel
## BR-E
## MA-0
## 27
## Contact Format
## Validation
All email
addresses and
phone
numbers shall
be validated
before
## Message
creation or
send attempt
## Contact
information
present
System shall
validate email
format and
phone number
structure
before
sending.
## Email,
## SMS

message
dispatch.
## BR-E
## MA-0
## 28
## Invalid Contact
## Blocking
## Messages
shall not be
dispatched to
contacts
marked as
invalid.
Send attempt Contact
status =
## Invalid
System shall
block dispatch
and log
suppression
reason.
## Email,
## SMS
## BR-E
## MA-0
## 29
## Country Code
## Standardization
## SMS
numbers shall
follow
international
format (E.164
standard).
Phone number
entry
## SMS
channel
selected
System shall
normalize and
validate phone
number before
send.
## SMS


H. Bounce Suppression Enhancement (Hard vs Soft)
This section differentiates between permanent and temporary delivery failures to protect sender reputation
while allowing retry for recoverable errors.

## Rule
## ID
## Rule Title Rule
## Statement
Trigger/Event Conditions System
## Enforcement
## Applicable
## Channel
## BR-E
## MA-0
## 30
## Hard
## Bounce
## Suppression
Contacts with a
hard bounce
shall be
immediately
marked as
invalid.
## Delivery
failure
Failure type
## = Hard
## Bounce
System shall
suppress future
email sends.
## Email
## BR-E
## MA-0
## 31
## Soft Bounce
## Retry Policy
Soft bounces
shall trigger
retry attempts
before
suppression.
## Delivery
failure
Failure type
## = Soft
## Bounce
System shall
retry per retry
logic before
suppression.
## Email

## BR-E
## MA-0
## 32
Soft-to-Hard
## Conversion
## Three (3)
consecutive
soft bounces
shall convert to
hard
suppression
status.
## Bounce
tracking
Soft bounce
threshold
reached
System shall
mark contact as
invalid.
## Email

## Recommended Industry Standard:
Immediate suppression for hard bounces; 2–3 retry attempts for soft bounces.

## I. Consent Timestamp Logging
This section ensures that all marketing consent actions are traceable for compliance and audit purposes.

## Rule
## ID
## Rule Title Rule
## Statement
Trigger/Event Conditions System
## Enforcement
## Applicable
## Channel
## BR-E
## MA-0
## 33
## Consent
## Timestamp
## Logging
The system
shall record the
timestamp of
all opt-in and
opt-out
actions.
## Consent
update
User action
recorded
System shall
store date/time
and consent
status.
Email, SMS
## BR-E
## MA-0
## 34
## Consent
## Source
## Tracking
The system
shall record the
source of
consent
acquisition.
## Consent
capture
## Signup,
campaign,
manual entry
System shall
store source
metadata.
Email, SMS
## BR-E
## MA-0
## 35
## Immutable
## Consent
## Records
## Consent
records shall
not be editable
once stored.
## Consent
update
## Record
created
System shall
preserve
historical
consent logs.
Email, SMS


## J. Campaign Approval Workflow
This section defines approval requirements before campaign activation to ensure brand consistency and
compliance.

## Rule
## ID
## Rule Title Rule
## Statement
Trigger/Event Conditions System
## Enforcement
## Applicable
## Channel

## BR-E
## MA-0
## 36
## Campaign
## Approval
## Requirement
## Marketing
campaigns
must be
approved
before
activation.
## Campaign
creation
## Status =
## Pending
## Approval
System shall
prevent launch
without
approval.
## Email,
## SMS
## BR-E
## MA-0
## 37
## Scheduled
## Campaign
## Lock
## Approved
campaigns
scheduled for
dispatch shall
be locked
from editing.
## Scheduled
campaign
## Dispatch
time set
System shall
prevent edits
unless reverted
to draft.
## Email,
## SMS
## BR-E
## MA-0
## 38
## Emergency
## Campaign
## Suspension
Admin shall
have authority
to suspend
active
campaigns.
## Manual
intervention
Admin role
validated
System shall
immediately
halt campaign
dispatch.
## Email,
## SMS


## K. Blacklist / Suppression List Governance
This section governs permanent suppression of contacts due to fraud, abuse, or regulatory requirements.

## Rule
## ID
## Rule Title Rule
## Statement
Trigger/Event Conditions System
## Enforcement
## Applicable
## Channel
## BR-E
## MA-0
## 39
## Global
## Suppression
## List
The system
shall
maintain a
global
suppression
list.
## Suppression
event
## Contact
flagged
System shall
block all
marketing
communications.
## Email,
## SMS
## BR-E
## MA-0
## 40
## Manual
## Blacklisting
## Authorized
Admin may
manually
blacklist a
contact.
Admin action Valid
justification
System shall
suppress future
communications.
## Email,
## SMS

## BR-E
## MA-0
## 41
## Suppression
## Override
## Restriction
## Blacklisted
contacts shall
not receive
marketing
messages
even if
consent is
active.
Send attempt Contact
status =
## Blacklisted
System shall
block dispatch.
## Email,
## SMS


L. SLA & Delivery Time Standards
This section defines acceptable delivery performance benchmarks to ensure operational reliability.

## Rule
## ID
## Rule Title Rule
## Statement
Trigger/Event Conditions System
## Enforcement
## Applicable
## Channel
## BR-E
## MA-0
## 42
## Transactional
## SLA
## Transactional
notifications
shall be
dispatched
within sixty
(60) seconds
of event
confirmation.
Event trigger System
operational
System shall
prioritize
transactional
queue.
## Email,
## SMS
## BR-E
## MA-0
## 43
## Marketing
## Delivery
## Window
## Marketing
messages shall
be delivered
within
scheduled
timeframe ±5
minutes.
## Campaign
dispatch
## Scheduled
time
reached
System shall
monitor delivery
delay.
## Email,
## SMS
## BR-E
## MA-0
## 44
## Queue
## Threshold
## Alert
If pending
message
queue exceeds
defined
threshold, alert
shall be
triggered.
## Queue
monitoring
## Threshold
breached
System shall
notify
DevOps/Admin.
## Email,
## SMS




## M. Escalation & Incident Handling
This section defines escalation protocols when delivery infrastructure or automation services fail.

## Rule
## ID
## Rule Title Rule
## Statement
Trigger/Event Conditions System
## Enforcement
## Applicable
## Channel
## BR-E
## MA-0
## 45
## Provider
## Failure
## Escalation
## Extended
messaging
provider failure
shall trigger
incident
escalation.
## Delivery
failure spike
## Failure >
defined
threshold
System shall
notify technical
team.
## Email,
## SMS
## BR-E
## MA-0
## 46
## Domain
## Reputation
## Monitoring
Significant drop
in deliverability
rate shall
trigger review.
## Performance
monitoring
Bounce rate
> threshold
System shall
flag
compliance
review.
## Email
## BR-E
## MA-0
## 47
## Incident
## Logging
## All
automation-rela
ted incidents
shall be logged.
System error Error
recorded
System shall
log timestamp
and resolution
status.
## Email,
## SMS


N. Role-Based Access Control (RBAC)
This section defines access limitations and permission controls to prevent unauthorized manipulation of
automation settings.
## Rule
## ID
Rule Title Rule Statement Trigger/Event Conditions System
## Enforcement
## Applicable
## Channel
## BR-E
## MA-0
## 48
## Role
## Restriction
## Enforcement
## Automation
controls shall be
accessible only
to authorized
roles.
Access attempt Role
validation
System shall
restrict access
by role
permissions.
## Email,
## SMS
## BR-E
## MA-0
## 49
## Log
## Immutability
## Communication
logs shall not be
editable by any
role.
Log access Any role System shall
enforce
read-only
access.
## Email,
## SMS

## BR-E
## MA-0
## 50
## Seller
## Limitation
Sellers shall not
modify
transactional,
security, or
consent
enforcement
rules.
Seller access
attempt
Seller role System shall
block
configuration
access.
## Email,
## SMS
