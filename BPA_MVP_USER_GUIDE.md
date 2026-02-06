# 📘 BPA MVP User Guide
## Complete Guide to Using Bangladesh Pet Association Platform

*Version: 1.0.0 | Last Updated: January 2026*

---

## 📋 Table of Contents

1. [Getting Started](#1-getting-started)
2. [Owner Dashboard Guide](#2-owner-dashboard-guide)
3. [Admin Dashboard Guide](#3-admin-dashboard-guide)
4. [Shop Dashboard Guide](#4-shop-dashboard-guide)
5. [Clinic Dashboard Guide](#5-clinic-dashboard-guide)
6. [Social & Community Features](#6-social--community-features)
7. [Achievement & Gamification](#7-achievement--gamification)
8. [Fundraising & Donations](#8-fundraising--donations)
9. [Mobile App Guide](#9-mobile-app-guide)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Getting Started

### 1.1 Accessing the Platform

**Web Access:**
- Owner Dashboard: `http://localhost:3104` (Port 3104)
- Admin Dashboard: `http://localhost:3103` (Port 3103)
- Shop Dashboard: `http://localhost:3101` (Port 3101)
- Clinic Dashboard: `http://localhost:3102` (Port 3102)
- Mother App (Public): `http://localhost:3100` (Port 3100)

**Mobile App:**
- Download from Play Store / App Store (Coming Soon)
- Or scan QR code from website

### 1.2 First Time Login

#### For Owners:
1. Go to Owner Login: `/owner/login`
2. Enter your **Email** or **Phone Number**
3. Enter your **Password**
4. Click **"Login"**
5. You'll be redirected to Owner Dashboard

#### For Staff:
1. You'll receive an **invitation email** from your Owner
2. Click the invitation link
3. Create your account with:
   - Email/Phone
   - Password
   - Personal details
4. Complete profile setup
5. Access your assigned dashboard (Shop/Clinic)

#### For Admin:
1. Go to Admin Login: `/admin/login`
2. Enter admin credentials
3. Access Admin Dashboard

### 1.3 Account Setup

**Complete Your Profile:**
1. Click on your **Profile** icon (top right)
2. Select **"Profile"** from dropdown
3. Fill in:
   - Full Name
   - Phone Number
   - Email
   - Address
   - Profile Picture
4. Click **"Save"**

---

## 2. Owner Dashboard Guide

### 2.1 Dashboard Overview

**Location:** `/owner/dashboard`

**What You'll See:**
- **Summary Cards:**
  - Total Organizations
  - Total Branches
  - Total Staff
  - Total Orders (Today)
  - Total Revenue (Today)

- **Quick Actions:**
  - Create Organization
  - Create Branch
  - Invite Staff
  - View Reports

- **Recent Activity:**
  - Latest orders
  - New staff invitations
  - Verification status updates

### 2.2 Organization Management

#### Create Organization

**Steps:**
1. Go to **"My Business"** → **"Organizations"**
2. Click **"Create Organization"** button
3. Fill in:
   - **Organization Name** (e.g., "Dhaka Pet Care")
   - **Organization Type** (Business/NGO/Clinic Group)
   - **Description**
   - **Contact Information**
   - **Address**
4. Upload **Logo** (optional)
5. Click **"Create"**

**Result:** Organization created, you'll be redirected to organization details page.

#### Manage Organization

**View Organization:**
- Click on organization name from list
- See all details, branches, staff

**Edit Organization:**
1. Go to organization details page
2. Click **"Edit"** button
3. Update information
4. Click **"Save"**

**Delete Organization:**
- ⚠️ **Warning:** This will delete all branches and staff
- Only do this if organization is inactive
- Go to organization → Settings → Delete

### 2.3 Branch Management

#### Create Branch

**Steps:**
1. Go to **"My Business"** → **"Branches"**
2. Click **"Create Branch"** button
3. Select **Organization** (if multiple)
4. Fill in:
   - **Branch Name** (e.g., "Gulshan Clinic")
   - **Branch Type:**
     - Clinic
     - Shop
     - Hub (Delivery)
   - **Location:**
     - Division
     - District
     - Upazila
     - Area
     - Full Address
   - **Contact:**
     - Phone
     - Email
   - **Operating Hours**
5. Upload **Branch Photos** (minimum 3)
6. Click **"Create"**

**Result:** Branch created in **DRAFT** status.

#### Branch Verification

**After Creating Branch:**
1. Branch status: **DRAFT**
2. Review all information
3. Click **"Submit for Verification"**
4. Status changes to **SUBMITTED**
5. Admin will review
6. You'll receive notification when:
   - **VERIFIED** (approved)
   - **REQUEST_CHANGES** (needs updates)
   - **REJECTED** (with reason)

**If Changes Requested:**
1. Go to branch details
2. Click **"Update Information"**
3. Make required changes
4. Re-submit for verification

#### Manage Branch

**View Branch:**
- Click on branch name
- See:
  - Branch details
  - Staff list
  - Products/Services
  - Orders
  - Reports

**Edit Branch:**
1. Go to branch details
2. Click **"Edit"**
3. Update information
4. Click **"Save"**

**Branch Team:**
1. Go to branch → **"Team"** tab
2. See all staff assigned to this branch
3. Add/Remove staff
4. Assign roles

### 2.4 Staff Management

#### Invite Staff

**Steps:**
1. Go to **"My Business"** → **"Staffs"**
2. Click **"Invite Staff"** button
3. Fill in:
   - **Email** or **Phone Number**
   - **Name**
   - **Role:**
     - Branch Manager
     - Staff
     - Seller
     - Vet (for clinics)
     - Clinic Assistant
   - **Assign to Branch** (select branch)
4. Click **"Send Invitation"**

**Result:** Staff receives invitation email/SMS with registration link.

#### Manage Staff

**View Staff List:**
- Go to **"My Business"** → **"Staffs"**
- See all staff with:
  - Name
  - Email/Phone
  - Role
  - Branch
  - Status (Active/Inactive)

**Edit Staff:**
1. Click on staff name
2. Click **"Edit"**
3. Update:
   - Role
   - Branch assignment
   - Permissions
4. Click **"Save"**

**Disable Staff:**
- Click **"Disable"** button
- Staff can't login but data preserved

**Delete Staff:**
- ⚠️ **Warning:** Permanent deletion
- Click **"Delete"** → Confirm

### 2.5 Product Management

#### Create Product

**Steps:**
1. Go to **"Products"** (from sidebar)
2. Click **"Add Product"** button
3. Fill in:
   - **Product Name** (e.g., "Premium Dog Food")
   - **Description**
   - **Category** (select or create new)
   - **SKU** (Stock Keeping Unit - unique code)
   - **Base Price**
4. **Add Variants** (if applicable):
   - Click **"Add Variant"**
   - Variant Name (e.g., "Small", "Large", "Chicken Flavor")
   - Variant Price
   - Variant SKU
5. Upload **Product Images** (multiple)
6. Set **Initial Stock** (per branch)
7. Click **"Create"**

**Result:** Product created, available in all your branches.

#### Manage Products

**View Products:**
- See list with:
  - Product name
  - Category
  - Price
  - Stock (per branch)
  - Status

**Edit Product:**
1. Click on product name
2. Click **"Edit"**
3. Update information
4. Click **"Save"**

**Delete Product:**
- ⚠️ **Warning:** Can't delete if orders exist
- Click **"Delete"** → Confirm

**Bulk Actions:**
- Select multiple products
- Bulk update price
- Bulk update stock
- Bulk delete

### 2.6 Inventory Management

#### View Stock

**Steps:**
1. Go to **"Inventory"** (from sidebar)
2. Select **Branch** (if multiple)
3. See stock list:
   - Product name
   - Current stock
   - Minimum stock (alert threshold)
   - Status (In Stock / Low Stock / Out of Stock)

**Stock Status Colors:**
- 🟢 **Green:** In Stock (above minimum)
- 🟡 **Yellow:** Low Stock (below minimum)
- 🔴 **Red:** Out of Stock

#### Adjust Stock

**Manual Adjustment:**
1. Go to Inventory
2. Find product
3. Click **"Adjust Stock"**
4. Enter:
   - Adjustment type: **Add** or **Remove**
   - Quantity
   - Reason (optional)
5. Click **"Save"**

**Stock Transfer:**
1. Go to Inventory
2. Click **"Transfer Stock"**
3. Select:
   - **From Branch**
   - **To Branch**
   - **Product**
   - **Quantity**
4. Click **"Transfer"**

#### Stock Alerts

**Low Stock Alerts:**
- Automatic notification when stock below minimum
- Email/SMS alert
- Dashboard notification

**Expiring Items:**
- See items expiring in next 30 days
- Take action to sell or remove

### 2.7 Order Management

#### View Orders

**Steps:**
1. Go to **"Orders"** (from sidebar)
2. See order list with:
   - Order Number
   - Customer Name
   - Branch
   - Total Amount
   - Status
   - Date

**Filter Orders:**
- By Branch
- By Status (Pending, Confirmed, Processing, Shipped, Delivered, Cancelled)
- By Date Range
- By Customer

#### Order Details

**View Order:**
1. Click on order number
2. See:
   - Customer information
   - Order items
   - Payment details
   - Shipping address
   - Order timeline

**Update Order Status:**
1. Go to order details
2. Click **"Update Status"**
3. Select new status
4. Add notes (optional)
5. Click **"Update"**

**Cancel Order:**
- Click **"Cancel Order"**
- Select reason
- Confirm cancellation
- Refund processed (if paid)

### 2.8 Reports & Analytics

#### Sales Reports

**Steps:**
1. Go to **"Reports"** → **"Sales"**
2. Select:
   - **Date Range** (Today, This Week, This Month, Custom)
   - **Branch** (All or specific)
3. View:
   - Total Sales
   - Number of Orders
   - Average Order Value
   - Top Selling Products
   - Revenue Trends (Chart)

**Export Report:**
- Click **"Export"** button
- Choose format: Excel or PDF
- Download report

#### Stock Reports

**Steps:**
1. Go to **"Reports"** → **"Stock"**
2. View:
   - **Stock Aging:** Products not sold in X days
   - **Top Sellers:** Best selling products
   - **Zero Sales:** Products with no sales (last 3 months)
   - **Expiring Items:** Items expiring soon

**Take Action:**
- Review zero sales products → Consider removing
- Check expiring items → Run promotions
- Analyze top sellers → Increase stock

#### Revenue Analytics

**Dashboard Widgets:**
- Daily Revenue
- Weekly Comparison
- Monthly Growth
- Branch-wise Performance
- Product Category Performance

---

## 3. Admin Dashboard Guide

### 3.1 Dashboard Overview

**Location:** `/admin/dashboard`

**What You'll See:**
- Platform statistics
- Pending verifications
- Recent activities
- System health

### 3.2 Verification Management

#### Review Owner Verification

**Steps:**
1. Go to **"Verifications"** → **"Owners"**
2. See list of submitted verifications
3. Click on owner name
4. Review:
   - Personal information
   - Documents (NID, Business License, etc.)
   - Organization details
5. **Take Action:**
   - **Approve:** Click **"Approve"** → Owner verified
   - **Request Changes:** Click **"Request Changes"** → Add comments → Owner notified
   - **Reject:** Click **"Reject"** → Add reason → Owner notified

#### Review Branch Verification

**Steps:**
1. Go to **"Verifications"** → **"Branches"**
2. See list of submitted branches
3. Click on branch name
4. Review:
   - Branch information
   - Location details
   - Photos (minimum 3 required)
   - Documents
5. **Take Action:**
   - **Approve:** Branch can start operations
   - **Request Changes:** Owner needs to update
   - **Reject:** With reason

### 3.3 User Management

#### View All Users

**Steps:**
1. Go to **"System"** → **"Users"**
2. See all platform users:
   - Owners
   - Staff
   - Customers (future)

**Filter Users:**
- By Role
- By Status (Active/Inactive/Blocked)
- By Organization
- By Date

#### Manage Users

**View User:**
- Click on user name
- See:
  - Profile information
  - Organizations/Branches
  - Activity log
  - Permissions

**Block User:**
- Click **"Block"** button
- User can't login
- Data preserved

**Unblock User:**
- Click **"Unblock"** button
- User can login again

### 3.4 Organization Management

#### View All Organizations

**Steps:**
1. Go to **"Business"** → **"Organizations"**
2. See all organizations on platform
3. Filter by:
   - Status
   - Type
   - Location
   - Date

#### Manage Organizations

**View Organization:**
- Click on organization name
- See:
   - Details
   - Branches
   - Staff
   - Statistics

**Suspend Organization:**
- Click **"Suspend"**
- All branches and staff suspended
- Can reactivate later

### 3.5 System Settings

#### Manage Roles & Permissions

**Steps:**
1. Go to **"System"** → **"Roles"**
2. See all roles:
   - SUPER_ADMIN
   - ORG_OWNER
   - BRANCH_MANAGER
   - STAFF
   - VET
   - etc.

**Edit Role:**
1. Click on role name
2. See assigned permissions
3. Add/Remove permissions
4. Click **"Save"**

#### Manage Permissions

**Steps:**
1. Go to **"System"** → **"Permissions"**
2. See all permissions:
   - `branch.read`
   - `product.create`
   - `order.view`
   - etc.

**Create Permission:**
1. Click **"Add Permission"**
2. Enter:
   - Permission key (e.g., `product.delete`)
   - Description
3. Click **"Create"**

---

## 4. Shop Dashboard Guide

### 4.1 Dashboard Overview

**Location:** `/shop`

**What You'll See:**
- Today's sales
- Low stock alerts
- Pending orders
- Quick actions

### 4.2 POS System (Point of Sale)

#### Start a Sale

**Steps:**
1. Go to **"POS"** (from sidebar)
2. POS interface opens (full-screen recommended)
3. **Add Products to Cart:**
   - **Method 1:** Search product name
   - **Method 2:** Scan barcode
   - **Method 3:** Browse product list
4. Select product → Click **"Add to Cart"**
5. Adjust quantity if needed
6. Repeat for all items

#### Process Payment

**Steps:**
1. Review cart items
2. Check total amount
3. Click **"Checkout"**
4. Select **Payment Method:**
   - Cash
   - Card
   - Mobile Payment (bKash, Nagad, etc.)
   - Online Payment
5. Enter payment details
6. Click **"Complete Sale"**

**Result:**
- Order created
- Stock automatically deducted
- Receipt generated
- Print receipt (optional)

#### Print Receipt

**After Sale:**
1. Receipt automatically generated
2. Click **"Print Receipt"** button
3. Select printer
4. Receipt includes:
   - Shop name
   - Date & Time
   - Order number
   - Items list
   - Total amount
   - Payment method
   - Thank you message

### 4.3 Inventory Management (Shop)

#### View Stock

**Steps:**
1. Go to **"Inventory"**
2. See products available in your branch
3. Check stock levels
4. See low stock alerts

#### Update Stock

**Manual Update:**
1. Find product
2. Click **"Update Stock"**
3. Enter new quantity
4. Click **"Save"**

### 4.4 Order Management (Shop)

#### View Orders

**Steps:**
1. Go to **"Orders"**
2. See all orders for your branch:
   - Online orders
   - POS orders
   - Status of each order

#### Process Online Orders

**Steps:**
1. See **"Pending"** orders
2. Click on order
3. Review order details
4. **Take Action:**
   - **Confirm:** Click **"Confirm Order"**
   - **Cancel:** Click **"Cancel"** (with reason)
5. If confirmed:
   - Prepare order
   - Update status to **"Processing"**
   - When ready: **"Ready for Pickup"** or **"Shipped"**

---

## 5. Clinic Dashboard Guide

### 5.1 Dashboard Overview

**Location:** `/clinic`

**What You'll See:**
- Today's appointments
- Pending consultations
- Patient statistics
- Quick actions

### 5.2 Service Management

#### Create Service

**Steps:**
1. Go to **"Services"** (from sidebar)
2. Click **"Add Service"**
3. Fill in:
   - **Service Name** (e.g., "General Consultation")
   - **Description**
   - **Category:**
     - Consultation
     - Vaccination
     - Surgery
     - Grooming
     - Lab Test
   - **Price**
   - **Duration** (in minutes)
   - **Staff Assignment** (which vet provides this)
4. Click **"Create"**

#### Manage Services

**View Services:**
- See all services offered
- Filter by category
- See pricing

**Edit Service:**
- Click on service name
- Update information
- Save changes

### 5.3 Appointment Management

#### Book Appointment

**Steps:**
1. Go to **"Appointments"**
2. Click **"Book Appointment"**
3. Fill in:
   - **Customer/Pet Owner** (select or create new)
   - **Pet** (select or create new)
   - **Service** (select from list)
   - **Date & Time**
   - **Vet** (select assigned vet)
   - **Notes** (optional)
4. Click **"Book"**

**Result:** Appointment scheduled, customer notified.

#### Manage Appointments

**View Appointments:**
- **Calendar View:** See all appointments on calendar
- **List View:** See appointments in list
- Filter by:
  - Date
  - Vet
  - Status (Scheduled, Completed, Cancelled, No Show)

**Update Appointment:**
1. Click on appointment
2. Update:
   - Time
   - Status
   - Notes
3. Click **"Save"**

**Complete Appointment:**
1. After consultation
2. Click **"Complete Appointment"**
3. Add:
   - Diagnosis
   - Prescription
   - Follow-up date (if needed)
4. Click **"Save"**

### 5.4 Patient Management

#### Create Pet Profile

**Steps:**
1. Go to **"Patients"**
2. Click **"Add Patient"**
3. Fill in:
   - **Pet Name**
   - **Pet Type** (Dog, Cat, Bird, etc.)
   - **Breed**
   - **Age**
   - **Gender**
   - **Weight**
   - **Owner Information**
   - **Medical History** (optional)
4. Upload **Pet Photo**
5. Click **"Create"**

#### View Pet History

**Steps:**
1. Go to **"Patients"**
2. Click on pet name
3. See:
   - Pet profile
   - All appointments
   - Medical history
   - Vaccination records
   - Prescriptions
   - Lab reports

#### Add Medical Record

**Steps:**
1. Go to pet profile
2. Click **"Add Record"**
3. Fill in:
   - **Date**
   - **Type** (Consultation, Vaccination, Surgery, etc.)
   - **Diagnosis**
   - **Prescription**
   - **Notes**
4. Upload documents (reports, X-rays, etc.)
5. Click **"Save"**

---

## 6. Social & Community Features

### 6.1 Accessing Social Feed

**Location:** `/mother/feed` or Mobile App

**What You'll See:**
- Posts from pet parents
- Pet photos
- Health tips
- Community updates

### 6.2 Creating a Post

**Steps:**
1. Go to **"Feed"**
2. Click **"Create Post"** button (top right)
3. Choose post type:
   - **Text Post:** Write text only
   - **Photo Post:** Upload 1-10 photos
   - **Video Post:** Upload video
   - **Story:** 24-hour post
4. Write **Caption**
5. Add **Hashtags** (e.g., #PetCare #DogLovers)
6. Select **Category:**
   - General
   - Tips
   - Stories
   - Questions
7. Click **"Post"**

**Result:** Post appears in feed, followers notified.

### 6.3 Interacting with Posts

#### Like a Post
- Click **❤️ Like** button below post
- Like count increases
- You can unlike by clicking again

#### Comment on Post
1. Click **💬 Comment** button
2. Type your comment
3. Click **"Post Comment"**
4. Comment appears below post

#### Share a Post
1. Click **📤 Share** button
2. Choose sharing method:
   - Share to Feed
   - Share to WhatsApp
   - Share to Facebook
   - Copy Link
3. Follow prompts

### 6.4 Following & Followers

#### Follow Someone
1. Go to their profile
2. Click **"Follow"** button
3. You'll see their posts in your feed

#### View Followers
1. Go to your profile
2. Click **"Followers"**
3. See list of people following you

#### View Following
1. Go to your profile
2. Click **"Following"**
3. See list of people you follow

### 6.5 Pet Parent Groups

#### Join a Group
1. Go to **"Groups"** (from menu)
2. Browse available groups:
   - By Location (e.g., "Dhaka Pet Parents")
   - By Pet Type (e.g., "Dog Owners BD")
   - By Interest (e.g., "Pet Health Tips")
3. Click **"Join Group"**

#### Create a Group
1. Go to **"Groups"**
2. Click **"Create Group"**
3. Fill in:
   - Group name
   - Description
   - Category
   - Privacy (Public/Private)
4. Click **"Create"**

#### Post in Group
1. Go to group
2. Click **"Create Post"**
3. Write post (same as feed post)
4. Post appears in group feed

### 6.6 Events & Meetups

#### View Events
1. Go to **"Events"** (from menu)
2. See upcoming events:
   - Pet adoption drives
   - Vaccination camps
   - Pet shows
   - Community meetups

#### Create Event
1. Go to **"Events"**
2. Click **"Create Event"**
3. Fill in:
   - Event name
   - Description
   - Date & Time
   - Location
   - Category
4. Upload event image
5. Click **"Create"**

#### RSVP to Event
1. Go to event details
2. Click **"Going"** or **"Interested"**
3. Get notifications about event updates

---

## 7. Achievement & Gamification

### 7.1 Viewing Achievements

**Location:** `/mother/achievements` or Mobile App

**What You'll See:**
- Your current points
- Achievement progress
- Unlocked achievements
- Locked achievements

### 7.2 Achievement Categories

#### Pet Care Achievements
- **First Checkup:** Complete first vet visit
- **Vaccination Hero:** Complete all vaccinations
- **Health Monitor:** Track health regularly
- **Exercise Buddy:** Daily exercise routine

#### Community Achievements
- **Social Butterfly:** Post 100 times
- **Helper:** Make 50 helpful comments
- **Influencer:** Get 1000 followers
- **Event Organizer:** Organize 5 events

#### Shopping Achievements
- **First Purchase:** Make first order
- **Loyal Customer:** Make 10 orders
- **Review Master:** Write 20 reviews
- **Subscription Champion:** 6 months subscription

### 7.3 Earning Points

**Ways to Earn Points:**
- **Daily Login:** 10 points
- **Create Post:** 5 points per post
- **Like Post:** 1 point per like
- **Comment:** 2 points per comment
- **Share Post:** 3 points per share
- **Complete Order:** 50 points
- **Write Review:** 10 points
- **Attend Event:** 20 points
- **Donate:** 100 points per donation

### 7.4 Daily Challenges

**View Challenges:**
1. Go to **"Challenges"** (from menu)
2. See daily challenges:
   - "Post a pet photo today" (50 points)
   - "Share a health tip" (30 points)
   - "Comment on 3 posts" (20 points)
   - "Complete pet profile" (40 points)

**Complete Challenge:**
1. See challenge requirements
2. Complete the task
3. Points automatically added
4. Challenge marked as complete

### 7.5 Streak System

#### Login Streak
- Login daily to maintain streak
- Streak increases daily
- Break streak if miss a day
- **Rewards:**
  - 7 days: 2x points multiplier
  - 30 days: 3x points multiplier
  - 100 days: Special badge

#### Posting Streak
- Post daily to maintain streak
- Get bonus points for streaks

### 7.6 Level System

**Levels:**
- **Bronze:** 0-500 points
- **Silver:** 501-2000 points
- **Gold:** 2001-5000 points
- **Platinum:** 5001+ points

**Level Benefits:**
- Higher level = More discounts
- Exclusive features
- Priority support
- Special badges

### 7.7 Leaderboard

**View Leaderboard:**
1. Go to **"Leaderboard"** (from menu)
2. See rankings:
   - **Overall:** Top users by points
   - **Monthly:** This month's top users
   - **Weekly:** This week's top users
   - **By Category:** Top in specific categories

**Your Rank:**
- See your current position
- See points needed to move up
- Compete with friends

### 7.8 Using Points

#### Convert to Discounts
1. Go to **"Rewards"** (from menu)
2. See available rewards:
   - 100 points = 5% discount
   - 500 points = 10% discount
   - 1000 points = 15% discount
3. Click **"Redeem"**
4. Discount code generated
5. Use code at checkout

#### Exclusive Deals
- Higher level users get:
  - Early access to sales
  - Exclusive products
  - Special events invitation

---

## 8. Fundraising & Donations

### 8.1 Viewing Campaigns

**Location:** `/mother/fundraising` or Mobile App

**What You'll See:**
- Active fundraising campaigns
- Emergency cases
- Shelter support
- Adoption support

### 8.2 Campaign Types

#### Emergency Medical
- Urgent medical cases
- Quick funding needed
- Real-time progress
- Photo/video evidence

#### Shelter Support
- Monthly recurring donations
- Food, medicine, supplies
- Impact reports

#### Adoption Support
- Help families adopt pets
- Cover adoption fees
- Post-adoption support

#### Community Projects
- Spay/neuter programs
- Vaccination drives
- Education programs

### 8.3 Creating a Campaign

**Steps:**
1. Go to **"Fundraising"**
2. Click **"Create Campaign"**
3. Fill in:
   - **Campaign Title**
   - **Category** (Emergency, Shelter, Adoption, Community)
   - **Description** (tell the story)
   - **Goal Amount** (BDT)
   - **Deadline** (end date)
   - **Location**
4. Upload **Photos/Videos** (evidence)
5. Add **Updates** (optional)
6. Click **"Submit for Review"**

**Verification:**
- BPA Admin reviews campaign
- Verified campaigns get **"Verified"** badge
- Campaign goes live after approval

### 8.4 Donating to Campaign

**Steps:**
1. Go to campaign page
2. See:
   - Campaign story
   - Progress bar
   - Amount raised
   - Number of donors
   - Updates
3. Enter **Donation Amount**
4. Choose:
   - **One-time** donation
   - **Recurring** (monthly)
5. Select **Payment Method:**
   - bKash
   - Nagad
   - Bank Transfer
   - Card
6. Enter payment details
7. Click **"Donate"**

**Result:**
- Donation processed
- Progress bar updates
- You receive confirmation
- Your name appears in donors list (if not anonymous)

### 8.5 Campaign Updates

**View Updates:**
1. Go to campaign page
2. Scroll to **"Updates"** section
3. See:
   - Progress updates
   - Photo/video updates
   - Impact stories
   - Expense breakdown

**Create Update (Campaign Creator):**
1. Go to your campaign
2. Click **"Add Update"**
3. Write update
4. Upload photos/videos
5. Click **"Post Update"**

### 8.6 Transparency Features

**What You Can See:**
- **Real-time Progress:**
  - Amount raised
  - Percentage of goal
  - Number of donors
  - Time remaining

- **Expense Breakdown:**
  - How money is used
  - Receipts (if available)
  - Impact reports

- **Donor Recognition:**
  - Top donors (with permission)
  - Recent donations
  - Thank you messages

### 8.7 Sharing Campaigns

**Share to Social Media:**
1. Go to campaign page
2. Click **"Share"** button
3. Choose platform:
   - Facebook
   - WhatsApp
   - Twitter
   - Copy Link
4. Share with friends/family

**QR Code:**
- Each campaign has QR code
- Scan to donate directly
- Share QR code offline

---

## 9. Mobile App Guide

### 9.1 Download & Install

**Steps:**
1. Go to Play Store (Android) or App Store (iOS)
2. Search **"BPA - Bangladesh Pet Association"**
3. Click **"Install"**
4. Wait for download
5. Open app
6. Login with your account

### 9.2 App Features

#### Home Screen
- Feed (social posts)
- Quick actions
- Notifications
- Profile

#### Navigation
- Bottom navigation bar:
  - Home (Feed)
  - Discover (Explore)
  - Create (Post/Campaign)
  - Notifications
  - Profile

### 9.3 Key Features

#### Pet Profile Management
1. Go to **"My Pets"**
2. Add pet:
   - Name
   - Photo
   - Breed
   - Age
   - Health info
3. View health records
4. Track vaccinations

#### Appointment Booking
1. Go to **"Appointments"**
2. Click **"Book Appointment"**
3. Select:
   - Clinic
   - Service
   - Date & Time
4. Confirm booking
5. Get reminder notifications

#### Order Placement
1. Go to **"Shop"**
2. Browse products
3. Add to cart
4. Checkout
5. Select payment method
6. Place order
7. Track order status

#### Push Notifications
- Appointment reminders
- Order updates
- Social interactions
- Achievement unlocks
- Campaign updates

---

## 10. Troubleshooting

### 10.1 Login Issues

**Problem: Can't Login**

**Solutions:**
1. **Check Credentials:**
   - Verify email/phone is correct
   - Check password (case-sensitive)
   - Try "Forgot Password"

2. **Account Status:**
   - Account might be disabled
   - Contact admin or owner

3. **Browser Issues:**
   - Clear browser cache
   - Try different browser
   - Check if cookies enabled

4. **Network Issues:**
   - Check internet connection
   - Try different network

**Problem: Forgot Password**

**Solution:**
1. Go to login page
2. Click **"Forgot Password"**
3. Enter email/phone
4. Check email/SMS for reset link
5. Click link
6. Enter new password
7. Login with new password

### 10.2 Dashboard Issues

**Problem: Can't See Menu Items**

**Solutions:**
1. **Permission Issue:**
   - Your role might not have permission
   - Contact owner/admin to assign permissions

2. **Browser Cache:**
   - Clear cache
   - Hard refresh (Ctrl+F5)

3. **Account Type:**
   - Verify you're logged into correct dashboard
   - Owner → Owner dashboard
   - Staff → Shop/Clinic dashboard

**Problem: Data Not Loading**

**Solutions:**
1. Check internet connection
2. Refresh page
3. Clear browser cache
4. Check if API is running
5. Contact support if persists

### 10.3 POS Issues

**Problem: Stock Not Deducting**

**Solutions:**
1. Check if product has stock
2. Verify stock quantity
3. Refresh page
4. Try again
5. Contact support if issue persists

**Problem: Receipt Not Printing**

**Solutions:**
1. Check printer connection
2. Verify printer is online
3. Check printer settings
4. Try different printer
5. Save receipt as PDF (alternative)

### 10.4 Order Issues

**Problem: Order Status Not Updating**

**Solutions:**
1. Refresh page
2. Check if you have permission to update
3. Verify order is in correct status
4. Contact support

**Problem: Can't Cancel Order**

**Solutions:**
1. Check order status (can't cancel if already shipped/delivered)
2. Verify cancellation policy
3. Contact support for assistance

### 10.5 Payment Issues

**Problem: Payment Failed**

**Solutions:**
1. Check payment method details
2. Verify sufficient balance
3. Try different payment method
4. Check with payment provider
5. Contact support

### 10.6 Social Feed Issues

**Problem: Posts Not Showing**

**Solutions:**
1. Check internet connection
2. Refresh feed
3. Clear app cache
4. Logout and login again
5. Check if account is active

**Problem: Can't Upload Photo/Video**

**Solutions:**
1. Check file size (max 10MB for photos, 50MB for videos)
2. Verify file format (JPG, PNG, MP4)
3. Check storage permissions (mobile)
4. Try smaller file size
5. Contact support

### 10.7 Getting Help

#### Contact Support

**Email:** support@bpa.com
**Phone:** +880-XXXX-XXXX
**Live Chat:** Available in app (9 AM - 6 PM)

#### Report Bug

1. Go to **"Settings"** → **"Report Issue"**
2. Describe problem
3. Attach screenshots (if applicable)
4. Submit report
5. Get ticket number
6. Track status

#### FAQ

1. Go to **"Help"** → **"FAQ"**
2. Browse common questions
3. Find answers
4. Still need help? Contact support

---

## 11. Best Practices

### 11.1 For Owners

- **Regular Stock Checks:** Check inventory daily
- **Staff Training:** Train staff on POS system
- **Customer Service:** Respond to orders quickly
- **Reports Review:** Review reports weekly
- **Branch Verification:** Keep branch info updated

### 11.2 For Staff

- **Accurate Data Entry:** Enter correct information
- **Stock Management:** Update stock immediately
- **Customer Service:** Be polite and helpful
- **Receipt Printing:** Always print receipts
- **Report Issues:** Report problems immediately

### 11.3 For Pet Parents

- **Complete Profile:** Fill all pet information
- **Regular Updates:** Update health records
- **Engage Socially:** Post regularly, interact with community
- **Support Causes:** Donate to campaigns
- **Review Products:** Write helpful reviews

---

## 12. Security Tips

### 12.1 Password Security

- Use strong password (8+ characters, mix of letters, numbers, symbols)
- Don't share password
- Change password regularly
- Use different password for different accounts

### 12.2 Account Security

- Don't share login credentials
- Logout when done
- Don't use public computers
- Enable 2FA if available

### 12.3 Data Privacy

- Don't share personal information publicly
- Review privacy settings
- Be careful with pet location data
- Report suspicious activity

---

## 13. Glossary

**BPA:** Bangladesh Pet Association
**POS:** Point of Sale (cash register system)
**KYC:** Know Your Customer (verification)
**SKU:** Stock Keeping Unit (product code)
**RBAC:** Role-Based Access Control
**MVP:** Minimum Viable Product
**i18n:** Internationalization (multi-language)

---

## 14. Quick Reference

### Keyboard Shortcuts (Web)

- `Ctrl + K`: Search
- `Ctrl + /`: Help
- `Esc`: Close modal
- `Enter`: Submit form

### Common Actions

**Create Product:** Products → Add Product
**Check Stock:** Inventory → View Stock
**Make Sale:** POS → Add Products → Checkout
**Book Appointment:** Appointments → Book Appointment
**Create Post:** Feed → Create Post
**Donate:** Fundraising → Select Campaign → Donate

---

## 15. Updates & Changelog

**Version 1.0.0 (January 2026):**
- Initial MVP release
- Core features implemented
- Social, Achievement, Fundraising features
- Multi-language support (English/Bengali)

**Check for Updates:**
- Go to Settings → About
- See current version
- Check for updates
- Update if available

---

## 16. Feedback & Suggestions

**We Value Your Feedback!**

**Ways to Provide Feedback:**
1. **In-App:** Settings → Feedback
2. **Email:** feedback@bpa.com
3. **Social Media:** @BPABangladesh
4. **Surveys:** Participate in user surveys

**Your feedback helps us improve!**

---

*This guide is continuously updated. Check back regularly for new features and updates.*

**Last Updated:** January 2026  
**Version:** 1.0.0  
**For Support:** support@bpa.com
