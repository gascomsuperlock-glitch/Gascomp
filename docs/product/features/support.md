# Customer support channels

[Specification index](../spec.md)

Product pages expose three service actions:

| Action | Destination |
| --- | --- |
| Warranty Claim | Internal `/klaim-garansi` flow with product and SKU context |
| Gascomp Care | Official Gascomp customer-contact page |
| Service Center | Official Gascomp service-center contact flow |

The brand is always written as “Gascomp.” External actions open the official Gascomp site in a new tab.

WhatsApp links use the configured support number and include a short English product/issue context when available. Customers can edit the message before sending it. The support-hours setting is displayed on the home page.

Status: all three service actions and WhatsApp support are implemented. The production team must verify the final support number and external destinations before deployment.
