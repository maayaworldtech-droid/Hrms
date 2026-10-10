# Project Rules: Maaya World HRMS

## UI & Design System Guidelines
Always adhere to the `clean-web-design` skill when working on any frontend, UI, or styling tasks:

- **No Nested Cards**: Do not place cards inside other cards. Keep hierarchies flat.
- **No Emojis**: Never use emojis anywhere in the interface. Use outline SVG icons (Lucide) only where they add direct clarity.
- **Card & Border Restraint**: Avoid unnecessary borders, gradients, and heavy drop-shadows. Use a clean white-and-slate design system with subtle 1px borders.
- **Typography & Spacing**: Maximum 3 font sizes per view. High contrast text (avoid light grey labels). Compact, productive spacing.
- **Leave Quotas**: Display total number of available leaves directly without unnecessary category breakdown cards unless explicitly requested.
- **Mobile First for Employees**: Employee portal must use the mobile shell (`EmployeeMobileLayout`), bottom navigation bar (Home, Attendance, Leave, Payslips, Profile), and mobile cards instead of wide desktop data tables.
- **Admin and Manager Interfaces**: Preserve desktop layout and existing tables/features without disruption.
