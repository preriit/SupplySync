# 🔐 AWS Security Fix - Complete Beginner's Guide

## Step 1: Login to AWS Console

1. Go to: https://console.aws.amazon.com/
2. Sign in with your AWS account email and password
3. After login, look at the TOP-RIGHT corner
4. Click on your account name → Should show a dropdown
5. Make sure you see "Mumbai" or "ap-south-1" in the region selector

---

## Step 2: Go to IAM (Identity & Access Management)

1. At the very TOP of the page, there's a search bar
2. Type: **IAM** (just these 3 letters)
3. Click on "IAM" in the results
4. You should see a dashboard with "Users", "Groups", "Roles", etc. on the left

---

## Step 3: Find the User with Exposed Keys

1. On the LEFT sidebar, click "Users"
2. You'll see a list of users (might be 1, might be several)
3. Look for a username like:
   - `supplysync`
   - `django-app`
   - `admin`
   - `developer`
   - Or your name
4. **SCREENSHOT THIS** and share with me - which users do you see?

---

## Step 4: Check Each User's Access Keys

For EACH user in the list:
1. Click on the username
2. Click the "Security credentials" tab
3. Scroll down to "Access keys" section
4. Look for a key starting with: **AKIAQBE7VRF...**

**Did you find it?**
- ✅ YES → This is the exposed key! Continue to Step 5
- ❌ NO → Try the next user in the list

---

## Step 5: Deactivate the Exposed Key (Safe First Step)

1. Next to the key (AKIAQBE7VRF...), click the dropdown "Actions"
2. Select "Deactivate"
3. Confirm
4. **WAIT 10 MINUTES** - see if your website breaks

**After 10 minutes, check:**
- Go to: https://www.supplysync.in
- Can you still login?
- Can you see product images?

**Results:**
- ✅ Everything works → Good! The key isn't being used. Continue to Step 6.
- ❌ Images don't load → The key is active. We'll need to update the server.

---

## Step 6: Create NEW Access Keys

1. Stay in the same user's "Security credentials" tab
2. Scroll back to "Access keys" section
3. Click button: "Create access key"
4. Select: "Application running on AWS compute service"
5. Click "Next"
6. Description: Type "SupplySync New Key - Feb 2026"
7. Click "Create access key"

**CRITICAL: Save These Keys!**
```
Access Key ID: AKIA________________
Secret Access Key: ____________________________
```

8. Click "Download .csv file" (saves to your computer)
9. **ALSO** - Copy both keys to a secure note
10. Click "Done"

---

## Step 7: Delete the Old Exposed Key

1. Find the old key (AKIAQBE7VRF...)
2. Click "Actions" → "Delete"
3. Type "Delete" to confirm
4. Click "Delete"

✅ **Exposed key is now gone!**

---

## Step 8: Share New Keys with Me (Securely)

**DON'T paste keys in chat!**

Just tell me: "I've created new keys and saved them securely"

We'll update the EC2 server together in the next step.

---

## ✅ Checklist

- [ ] Logged into AWS Console
- [ ] Found IAM Users section
- [ ] Located user with exposed key
- [ ] Deactivated old key
- [ ] Created new access key
- [ ] Downloaded .csv file
- [ ] Deleted old exposed key
- [ ] Saved new keys securely

**Once done, move to STEP 2: Access EC2 Server**

---

## ⚠️ If You Get Stuck

Take a screenshot of what you see and tell me:
1. "I'm stuck at Step X"
2. "I see [describe what's on screen]"
3. "I'm not sure what to do next"

I'll guide you through it!
