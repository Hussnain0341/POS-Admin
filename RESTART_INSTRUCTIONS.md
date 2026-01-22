# How to Restart and Test Login

## Step 1: Stop ALL Processes

**In your terminal where `npm run dev` is running:**
- Press `Ctrl+C` (press it multiple times if needed)
- Wait until you see the prompt again

**Or kill all Node processes:**
```powershell
Get-Process node | Stop-Process -Force
```

## Step 2: Clear Browser Cache

**In your browser:**
1. Press `Ctrl+Shift+Delete`
2. Select "Cached images and files"
3. Click "Clear data"
4. **OR** Press `Ctrl+F5` for hard refresh

## Step 3: Restart Everything

**In project root (`E:\POS\POS Admin Pannel`):**
```bash
npm run dev
```

Wait for:
- Backend: "Server running on port 3001"
- Frontend: "Compiled successfully!"

## Step 4: Test Login

1. Open browser: `http://localhost:3000/login`
2. Open Console (F12)
3. Enter:
   - Username: `admin`
   - Password: `admin123`
4. Click Login button
5. Check console for: `=== BUTTON CLICKED ===`

## If Still Refreshing:

1. **Check if frontend reloaded:**
   - Look for "Compiled successfully!" in terminal
   - Check browser console for any errors

2. **Verify button type:**
   - Right-click Login button → Inspect
   - Check if `type="button"` (should NOT be `type="submit"`)

3. **Try hard refresh:**
   - `Ctrl+Shift+R` or `Ctrl+F5`

4. **Check network tab:**
   - F12 → Network tab
   - Click Login
   - See if any request is made

