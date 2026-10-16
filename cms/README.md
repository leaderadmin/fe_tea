# Mộc Trà CMS

Standalone React application for managing the Mộc Trà storefront through the Laravel API.

## Local development

The root Docker Compose file runs this application on http://localhost:5174. The public React storefront runs separately on http://localhost:5173 and the Laravel API on http://localhost:8000.

For standalone development, set `VITE_API_BASE_URL` to the API URL and `VITE_PUBLIC_SITE_URL` to the public storefront URL before running `npm run dev`.

Sign in at `/admin/login`. Accounts and permissions are managed by the Laravel API; no default credentials are included. Administrators can create custom roles, assign feature permissions, and select those roles when creating or updating accounts. The built-in `admin` and `editor` roles cannot be renamed or deleted; the `admin` role cannot be edited.

Image URL fields provide a searchable picker backed by the media library. Product galleries support selecting multiple images; upload files in **Thư viện ảnh** before selecting them.

Long-form post and product descriptions, FAQ answers, page sections, and the homepage story use the rich-text editor. Content is saved as sanitized HTML; existing Markdown content is converted when opened in the editor and remains supported on the public site until it is edited.

All five settings groups use labeled fields instead of requiring JSON edits:

- **Thương hiệu**: brand name, tagline, and logo. Choose the logo from the media library or enter its URL.
- **Liên hệ**: phone, Zalo, email, address, and business hours; configured details appear in the footer and contact page.
- **SEO**: default page title, title suffix, and description for pages without their own SEO text.
- **Mạng xã hội**: Facebook, Instagram, TikTok, and YouTube links; only configured links appear in the footer.
- **Giao diện**: storefront primary, accent, background, surface, and text colors.

Settings are saved as drafts and must be approved before their public values take effect. Existing unknown settings are preserved when a labeled field is changed.

Menus and menu items are separate CRUD resources. In **Menu**, create a menu through the three-step flow: enter its name and type (FE or BE), choose its placement (Header/Footer for FE; CMS sidebar for BE), then open **Build cây menu**. In step 3, drag a menu item's handle into the root area to make it a parent, or drop it onto another item to make it a child. The same menu item can be reused in multiple menus. Manage item labels, URLs, targets, display order, and active state separately in **Danh sách menu item**. Save and submit each menu for review independently; approved FE menus in the same placement are combined on the storefront, while approved BE menus appear in the CMS sidebar. Trees support up to eight nested levels.
