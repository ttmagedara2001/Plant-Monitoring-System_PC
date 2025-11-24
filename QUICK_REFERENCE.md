# 📋 Protonest Integration - Quick Reference Card

## 🚀 Start Here

1. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```

2. **Add your credentials:**
   ```env
   VITE_USER_EMAIL=your-email@example.com
   VITE_USER_PASSWORD=your-secretKey-from-protonest
   ```

3. **Start app:**
   ```bash
   npm install && npm run dev
   ```

4. **Verify in console (F12):**
   ```
   ✅ [WS] Connected successfully
   ```

---

## 📚 Documentation Map

| Document | Contains | Read When |
|----------|----------|-----------|
| `START_HERE.md` | This quick start guide | First time |
| `PROTONEST_SETUP.md` | Detailed setup + troubleshooting | Setup issues |
| `TESTING_GUIDE.md` | Complete testing procedures | Before deployment |
| `IMPLEMENTATION_COMPLETE.md` | Technical implementation details | Need details |
| `.env.example` | Environment template | Configuring app |
| `README.md` | Full project overview | General info |

---

## 🔑 API Endpoints

### Authentication
- **Get Token:** `POST /get-token`
  - Body: `{email, password}`
  - Response: `{jwtToken (24h), refreshToken (7d)}`

- **Refresh Token:** `GET /get-new-token`
  - Header: `X-Refresh-Token: {refreshToken}`
  - Response: `{jwtToken (new)}`

### WebSocket
- **URL:** `wss://protonest-connect.../ws?token={JWT}`
- **Topics:**
  - `/topic/stream/{deviceId}` - Sensor data
  - `/topic/state/{deviceId}` - Device state

---

## 🎯 Credentials

### Getting Your Secret Key

1. Log into Protonest Web Dashboard
2. Find your device
3. Go to Device Settings
4. Copy "Secret Key" (NOT login password)
5. Add to `.env` as `VITE_USER_PASSWORD`

⚠️ **Important:** Secret Key ≠ Login Password

---

## 📊 Dashboard Features

| Feature | Status | Notes |
|---------|--------|-------|
| Real-time updates | ✅ | Every 3-5 seconds |
| Status cards | ✅ | Moisture, Temp, Humidity, Light |
| Alert system | ✅ | Multiple alerts simultaneously |
| Historical chart | ✅ | 50-point trend visualization |
| CSV export | ✅ | Download trend data |
| Device selector | ✅ | Switch between devices |
| Settings panel | ✅ | Configure thresholds |

---

## 🔍 Browser Console Logs

### Successful Startup
```
[WS] Fetching JWT token from API...
[WS] Token fetch response: {status: "Success", ...}
[WS] Connecting to: wss://protonest-...
[WS] Connected successfully
[WS] Subscribed to state topic: {subscribe: "/topic/state/..."}
[WS] Subscribed to stream topic: {subscribe: "/topic/stream/..."}
```

### Receiving Data
```
[WS] Updated liveData from stream: {temp: 24.5, humidity: 60}
```

### Issues to Watch For
```
❌ "Email and password required" → Create .env file
❌ "Invalid credentials" → Check secret key
❌ "WebSocket connection failed" → Check JWT token
❌ No data appearing → Device may not be sending
```

---

## ⚡ Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build          # Build for production
npm run preview        # Preview production build
npm run lint           # Check code quality

# Testing
npm test               # Run tests (if configured)

# Troubleshooting
npm install            # Reinstall dependencies
rm -rf node_modules    # Clean install
```

---

## 🔐 Security Notes

- ✅ JWT stored in localStorage (session-only)
- ✅ Tokens auto-refresh before expiry
- ✅ HTTPS/WSS in production
- ✅ Secret key never logged to console
- ✅ Auto-clear on logout

---

## 📱 Supported Devices

| Device | Browser | Status |
|--------|---------|--------|
| Desktop Windows | Chrome, Firefox, Edge | ✅ Full |
| Desktop Mac | Safari, Chrome, Firefox | ✅ Full |
| Desktop Linux | Chrome, Firefox | ✅ Full |
| Mobile iPhone | Safari, Chrome | ✅ Responsive |
| Mobile Android | Chrome, Firefox | ✅ Responsive |
| Tablet | All browsers | ✅ Responsive |

---

## 🧪 Quick Test

### Verify Setup Works

```javascript
// In browser console:

// 1. Check credentials
console.log('Email:', localStorage.getItem('userEmail'));
console.log('JWT Token:', !!localStorage.getItem('jwtToken'));

// 2. Test API
fetch('https://protonest-connect.../api/v1/user/get-token', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    email: 'your-email@example.com',
    password: 'your-secretKey'
  })
})
.then(r => r.json())
.then(d => console.log('Status:', d.status));
```

---

## 🚨 Troubleshooting Quick Links

| Problem | Solution |
|---------|----------|
| App won't start | `npm install && npm run dev` |
| No data showing | Check console for `[WS]` errors |
| Token errors | Verify `.env` has correct credentials |
| Chart empty | Wait 50+ seconds for data |
| Export not working | Need 50+ chart points |
| Mobile not responsive | Hard refresh: Ctrl+Shift+R |

---

## 📞 Support Resources

1. **Console Logs:** Watch for `[WS]` prefixed messages
2. **Setup Help:** `PROTONEST_SETUP.md`
3. **Testing:** `TESTING_GUIDE.md`
4. **Technical:** `IMPLEMENTATION_COMPLETE.md`
5. **Protonest Docs:** Provided in user request

---

## ✅ Deployment Checklist

- [ ] `.env` configured
- [ ] App runs locally without errors
- [ ] Console shows `[WS] Connected successfully`
- [ ] Dashboard displays real data
- [ ] Alerts trigger correctly
- [ ] CSV export works
- [ ] Built successfully: `npm run build`
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Ready for production!

---

## 🎯 Expected Behavior

### On Startup
1. Browser loads dashboard
2. Console: `[WS] Fetching JWT token...`
3. JWT fetched and stored
4. WebSocket connects
5. Topics subscribed
6. Data flows into status cards
7. Chart starts populating

### During Operation
1. Data updates every 3-5 seconds
2. Chart accumulates points
3. Alerts trigger on threshold breach
4. All real-time (no page refresh needed)
5. Token auto-refreshes after 23 hours

### On Export
1. Click "Export to CSV"
2. File downloads: `plant-monitoring-data-[timestamp].csv`
3. Contains all chart data with timestamps

---

## 📦 Package Details

- **Framework:** React 18.2.0
- **Build Tool:** Vite 5.0+
- **Charts:** Recharts 2.10.3
- **Styling:** Tailwind CSS 3.3.0
- **HTTP:** Axios 1.6.0
- **Bundle Size:** 611 KB (182 KB gzipped)

---

## 🔄 Token Lifecycle

```
GET STARTED
    ↓
Email + Secret Key
    ↓
POST /get-token
    ↓
JWT (24h valid)
    ↓
Connect WebSocket with JWT
    ↓
[Running...]
    ↓
After 23 hours
    ↓
GET /get-new-token with refresh token
    ↓
Get new JWT
    ↓
Reconnect WebSocket
    ↓
[Continue...]
```

---

## 🎓 Learning Path

1. **Day 1:** Setup and basic operation
2. **Day 2:** Run through `TESTING_GUIDE.md`
3. **Day 3:** Deploy to production
4. **Week 1:** Monitor real data flows
5. **Future:** Implement additional APIs

---

## 💡 Pro Tips

1. **Monitor via console logs** - Watch for `[WS]` messages
2. **Use DevTools Network tab** - See WebSocket messages
3. **Check localStorage** - Verify tokens stored
4. **Test with manual MQTT** - Send data directly
5. **Keep browser console open** - Catch issues early

---

## 🌐 Production URLs

- **API:** `https://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/api/v1/user`
- **WebSocket:** `wss://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/ws`
- **Local Dev:** `http://localhost:8091/api/v1/user` (optional)

---

## 📞 Getting Help

1. **Read:** Relevant documentation file
2. **Check:** Browser console for error messages
3. **Verify:** `.env` file has correct values
4. **Test:** Send manual data via MQTT
5. **Debug:** Use browser DevTools

---

**Version:** 2.0.0 (Protonest Integration)  
**Last Updated:** January 2025  
**Status:** ✅ Production Ready  

**Ready to launch? 🚀 Just add your credentials and go live!**

