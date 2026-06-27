/**
 * 🇰🇷 งานเกาหลี — Gamified Korean Study Tracker
 * Single-page app with localStorage persistence
 */
(function () {
  'use strict';

  // ─── Config ───
  const ACT_TYPES = [
    { id: 'vocab',    name: 'จดคำศัพท์',          emoji: '📝', base: 15, min: 10 },
    { id: 'writing',  name: 'เขียนประโยค/ไดอารี่', emoji: '✍️', base: 25, min: 15 },
    { id: 'reading',  name: 'อ่านบทความ',          emoji: '📖', base: 25, min: 20 },
    { id: 'listening',name: 'ฟัง Podcast/ข่าว',    emoji: '🎧', base: 20, min: 15 },
    { id: 'exam',     name: 'ทำข้อสอบเก่า',         emoji: '📋', base: 50, min: 60 },
    { id: 'flashcard',name: 'ท่อง Flashcard',      emoji: '🃏', base: 10, min: 5 },
    { id: 'journal',  name: 'เขียนบันทึกภาษาเกาหลี', emoji: '📔', base: 30, min: 20 },
  ];

  const SHOP_ITEMS = [
    { id: 'soda',         name: 'น้ำอัดลม',              emoji: '🥤', price: 40 },
    { id: 'milk-tea',     name: 'ชานมไข่มุก',           emoji: '🧋', price: 60 },
    { id: 'fc',           name: 'KFC 1 ชุด',            emoji: '🍗', price: 150 },
    { id: 'pizza',        name: 'พิซซ่า 1 ถาด',          emoji: '🍕', price: 200 },
    { id: 'sushi',        name: 'ซูชิ 1 ชุด',            emoji: '🍣', price: 250 },
    { id: 'shabu',        name: 'บุฟเฟ่ต์ชาบู',          emoji: '🥘', price: 450 },
  ];

  const STREAK_BONUSES = [
    { days: 3,  bonus: 50,  label: '3 วัน' },
    { days: 7,  bonus: 200, label: '7 วัน' },
    { days: 14, bonus: 500, label: '14 วัน' },
    { days: 30, bonus: 1500,label: '30 วัน' },
    { days: 60, bonus: 5000,label: '60 วัน' },
  ];

  const Q_TEMPLATES = [
    { desc: 'จดคำศัพท์ใหม่',        target: 50, unit: 'คำ',   reward: 200, type: 'vocab' },
    { desc: 'ทำข้อสอบเก่า',         target: 3,  unit: 'ชุด',   reward: 300, type: 'exam' },
    { desc: 'เขียนบันทึกภาษาเกาหลี', target: 5,  unit: 'วัน',   reward: 200, type: 'journal' },
    { desc: 'ฟัง Podcast เกาหลี',   target: 5,  unit: 'คลิป',  reward: 150, type: 'listening' },
    { desc: 'อ่านบทความภาษาเกาหลี',  target: 5,  unit: 'เรื่อง', reward: 200, type: 'reading' },
  ];

  const Q_MSGS = [
    'อาทิตย์นี้ลองท่องศัพท์ให้ได้ 50 คำ!',
    'ฝึกทำข้อสอบเก่า เดี๋ยวเก่งเอง!',
    'เขียนไดอารี่ภาษาเกาหลีวันละนิด',
    'ฟัง Podcast เกาหลีตอนก่อนนอน',
    'อ่านข่าวเกาหลีวันละเรื่อง',
  ];

  // ─── State ───
  let S = {
    coins: 0, totalEarned: 0, streak: 0, longestStreak: 0,
    lastLogDate: null, logs: [],
    shopItems: SHOP_ITEMS.map(function(i) { return { id: i.id, name: i.name, emoji: i.emoji, price: i.price, purchased: false, purchasedDate: null }; }),
    currentQuest: null, completedQuests: [],
    stats: { totalStudyDays: 0, totalStudyMinutes: 0, vocabCount: 0, examsCompleted: 0 },
    userName: '', examDate: null, streakMilestones: [],
  };

  // ─── Helpers ───
  function $(s, p) { p = p || document; return p.querySelector(s); }
  function $$(s, p) { p = p || document; return [].slice.call(p.querySelectorAll(s)); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function getWeek(d) { var dd = new Date(d); dd.setDate(dd.getDate() - dd.getDay()); return dd.toISOString().slice(0, 10); }
  function fmt(n) { return n.toLocaleString(); }

  // ─── Persistence ───
  function save() {
    try { localStorage.setItem('wks_data', JSON.stringify(S)); }
    catch(e) { console.warn('save', e); }
  }
  function load() {
    try {
      var raw = localStorage.getItem('wks_data');
      if (raw) {
        var p = JSON.parse(raw);
        for (var k in p) { if (k in S) S[k] = p[k]; }
      }
    } catch(e) { console.warn('load', e); }
  }

  // ─── Streak ───
  function calcStreak() {
    if (!S.logs.length) { S.streak = 0; return 0; }
    var dates = [], seen = {};
    S.logs.forEach(function(l) {
      if (!seen[l.date]) { seen[l.date] = true; dates.push(l.date); }
    });
    dates.sort().reverse();
    if (!dates.length) { S.streak = 0; return 0; }
    var td = today(), yd = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (dates[0] !== td && dates[0] !== yd) { S.streak = 0; return 0; }
    var s = 1;
    for (var i = 1; i < dates.length; i++) {
      if (Math.round((new Date(dates[i-1]) - new Date(dates[i])) / 86400000) === 1) s++;
      else break;
    }
    S.streak = s;
    if (s > S.longestStreak) S.longestStreak = s;
    return s;
  }

  function checkStreakBonus() {
    var ms = S.streakMilestones || [], bonus = 0;
    STREAK_BONUSES.forEach(function(sb) {
      if (S.streak >= sb.days && ms.indexOf(sb.days) === -1) {
        bonus += sb.bonus; ms.push(sb.days);
        toast('🔥 Streak ' + sb.label + '! +' + sb.bonus + '🪙');
      }
    });
    if (bonus > 0) { S.coins += bonus; S.totalEarned += bonus; S.streakMilestones = ms; save(); }
  }

  // ─── Quest ───
  function genQuest() {
    var wk = getWeek(new Date());
    if (S.currentQuest && S.currentQuest.week === wk) return;
    var shuffled = Q_TEMPLATES.slice().sort(function() { return Math.random() - 0.5; });
    var sel = shuffled.slice(0, 3);
    S.currentQuest = {
      week: wk,
      msg: Q_MSGS[Math.floor(Math.random() * Q_MSGS.length)],
      items: sel.map(function(q, i) {
        return { id: 'q' + i, desc: q.desc, target: q.target, progress: 0, unit: q.unit, reward: q.reward, type: q.type, done: false };
      }),
      completed: false,
    };
    save();
  }

  function qProgress() {
    if (!S.currentQuest) return { done: 0, total: 0, pct: 0 };
    var items = S.currentQuest.items || [];
    var d = 0; items.forEach(function(i) { if (i.done) d++; });
    return { done: d, total: items.length, pct: items.length ? Math.round(d / items.length * 100) : 0 };
  }

  // ─── Coin calc ───
  function calcCoins(type, dur, det) {
    var act = null;
    for (var i = 0; i < ACT_TYPES.length; i++) { if (ACT_TYPES[i].id === type) { act = ACT_TYPES[i]; break; } }
    if (!act) return 0;
    var c = act.base;
    if (dur >= act.min * 2) c += Math.floor(act.base * 0.5);
    if (dur >= act.min * 3) c += Math.floor(act.base * 0.5);
    if (det && det.length > 20) c += 5;
    return c;
  }

  function actByType(type) {
    for (var i = 0; i < ACT_TYPES.length; i++) { if (ACT_TYPES[i].id === type) return ACT_TYPES[i]; }
    return { emoji: '📝', name: type };
  }

  // ─── Actions ───
  function addLog(type, dur, desc, det) {
    var td = today();
    var time = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    var coins = calcCoins(type, dur, det);
    var log = { id: td + '-' + Date.now(), date: td, time: time, type: type, duration: dur, description: desc.trim(), details: det.trim(), coins: coins };
    S.logs.unshift(log);
    S.coins += coins;
    S.totalEarned += coins;
    S.lastLogDate = td;

    var days = {}, dc = 0;
    S.logs.forEach(function(l) { if (!days[l.date]) { days[l.date] = true; dc++; } });
    S.stats.totalStudyDays = dc;
    S.stats.totalStudyMinutes += dur;
    if (type === 'vocab') S.stats.vocabCount += det.split(',').length;
    if (type === 'exam') S.stats.examsCompleted++;
    calcStreak();

    // Quest progress
    if (S.currentQuest && !S.currentQuest.completed) {
      S.currentQuest.items.forEach(function(item) {
        if (item.type === type && !item.done) {
          item.progress = Math.min(item.progress + 1, item.target);
          if (item.progress >= item.target) {
            item.done = true;
            S.coins += item.reward;
            S.totalEarned += item.reward;
            toast('✅ Quest "' + item.desc + '" เสร็จ! +' + item.reward + '🪙');
          }
        }
      });
      var allDone = true;
      S.currentQuest.items.forEach(function(i) { if (!i.done) allDone = false; });
      if (allDone && !S.currentQuest.completed) {
        S.currentQuest.completed = true;
        toast('🎉 Weekly Quest สำเร็จแล้ว! 🏆');
      }
    }

    checkStreakBonus();
    save();
    renderAll();
    toast('+' + coins + '🪙 ' + (actByType(type).name));
  }

  function purchase(id) {
    var item = null;
    for (var i = 0; i < S.shopItems.length; i++) { if (S.shopItems[i].id === id) { item = S.shopItems[i]; break; } }
    if (!item || item.purchased) return;
    if (S.coins < item.price) { toast('⚠️ ไม่พอ! ขาดอีก ' + (item.price - S.coins) + '🪙'); return; }
    S.coins -= item.price;
    item.purchased = true;
    item.purchasedDate = today();
    save();
    renderAll();
    toast('✅ ' + item.emoji + ' ' + item.name + ' ');
  }

  function resetShop(id) {
    var item = null;
    for (var i = 0; i < S.shopItems.length; i++) { if (S.shopItems[i].id === id) { item = S.shopItems[i]; break; } }
    if (!item) return;
    item.purchased = false;
    item.purchasedDate = null;
    save(); renderAll();
  }

  // ─── Toast ───
  var _toastTimer = null;
  function toast(msg) {
    var el = document.querySelector('.toast');
    if (el) el.remove();
    if (_toastTimer) clearTimeout(_toastTimer);
    el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    _toastTimer = setTimeout(function() { el.remove(); }, 2500);
  }

  // ─── Tab ───
  function switchTab(tab) {
    $$('.tab-btn').forEach(function(b) { b.classList.toggle('active', b.dataset.tab === tab); });
    $$('.panel').forEach(function(p) { p.classList.toggle('active', p.id === tab + 'Panel'); });
    renderAll();
  }

  // ─── Render ───
  function renderAll() {
    // Header coin
    var cd = document.getElementById('coinDisplay');
    if (cd) cd.innerHTML = '<span class="coin-icon">🪙</span> ' + fmt(S.coins);

    // Sync status
    var ss = document.getElementById('syncStatus');
    if (ss) ss.innerHTML = '<span class="sync-dot"></span> เก็บในเครื่อง (localStorage)';

    renderDash();
    renderLogForm();
    renderLogList();
    renderShop();
    renderQuests();
    renderStats();
  }

  function renderDash() {
    var el = document.getElementById('dashContent');
    if (!el) return;
    var td = today();
    var studiedToday = false;
    for (var i = 0; i < S.logs.length; i++) { if (S.logs[i].date === td) { studiedToday = true; break; } }
    calcStreak();
    var qp = qProgress();
    var nextMs = null;
    for (var i = 0; i < STREAK_BONUSES.length; i++) {
      if (S.streak < STREAK_BONUSES[i].days) { nextMs = STREAK_BONUSES[i]; break; }
    }
    var recent = S.logs.slice(0, 5);
    var recentHtml = '';
    if (recent.length) {
      recentHtml = recent.map(function(l) {
        var a = actByType(l.type);
        return '<div class="log-item"><div class="log-icon">' + a.emoji + '</div><div class="log-body"><div class="log-type">' + a.name + '</div><div class="log-desc">' + l.description + '</div><div class="log-detail">' + l.date + ' · ' + l.duration + ' นาที</div></div><div class="log-coins">+' + l.coins + '</div></div>';
      }).join('');
    } else {
      recentHtml = '<div class="empty-state"><span class="icon">📚</span><p>ยังไม่มีการเรียนรู้ — เริ่มต้นเลย!</p></div>';
    }

    var sPct = nextMs ? Math.min(100, Math.round(S.streak / nextMs.days * 100)) : 100;
    var sLabel = nextMs ? (S.streak + '/' + nextMs.days) : (S.streak >= 60 ? '🔥 ตำนาน!' : '');

    var html = '';
    // Stats row
    html += '<div class="stat-row">';
    html += '<div class="stat-box"><span class="num">' + S.streak + '</span><div class="label">🔥 Streak</div></div>';
    html += '<div class="stat-box"><span class="num">' + qp.done + '/' + qp.total + '</span><div class="label">📋 Quest</div></div>';
    html += '<div class="stat-box"><span class="num">' + S.stats.totalStudyDays + '</span><div class="label">📅 วันที่เรียน</div></div>';
    html += '</div>';

    // Today status
    if (!studiedToday) {
      html += '<div class="card" style="border-color:rgba(251,191,36,.3);text-align:center;padding:20px">';
      html += '<div style="font-size:36px;margin-bottom:8px">📢</div>';
      html += '<div style="font-size:15px;font-weight:700;margin-bottom:4px">วันนี้ยังไม่ได้เรียนเลย!</div>';
      html += '<div style="font-size:12px;color:#64748b;margin-bottom:12px">อย่าพึ่ง Streak แตก!</div>';
      html += '<button class="btn btn-primary btn-sm" onclick="switchTab(\'log\')">📝 ไปจดบันทึกเลย</button></div>';
    } else {
      html += '<div class="card" style="border-color:rgba(34,197,94,.3);text-align:center;padding:14px">✅ เรียนแล้ววันนี้! รักษา Streak ต่อไป!</div>';
    }

    // Streak progress
    if (nextMs) {
      html += '<div class="card"><div class="card-title">🔥 Streak ถัดไป</div>';
      html += '<div style="display:flex;align-items:center;gap:12px">';
      html += '<div style="flex:1"><div style="font-size:12px;margin-bottom:4px">' + nextMs.label + ' → +' + nextMs.bonus + '🪙</div>';
      html += '<div class="progress-bar"><div class="progress-fill" style="width:' + sPct + '%"></div></div></div>';
      html += '<div style="font-size:22px;font-weight:700;color:#fbbf24">' + sLabel + '</div></div></div>';
    } else if (S.streak >= 60) {
      html += '<div class="card" style="text-align:center;border-color:rgba(251,191,36,.3)">🔥 Streak 60+ วัน! คุณคือตำนาน!</div>';
    }

    // Quest banner
    if (S.currentQuest && !S.currentQuest.completed) {
      html += '<div class="quest-banner"><div class="title">📋 Weekly Quest</div>';
      html += '<div class="sub">' + S.currentQuest.msg + '</div>';
      html += '<div style="margin-top:8px"><div class="progress-bar" style="background:rgba(0,0,0,.2)"><div class="progress-fill" style="width:' + qp.pct + '%;background:linear-gradient(90deg,#a78bfa,#22d3ee)"></div></div>';
      html += '<div style="font-size:11px;opacity:.6;text-align:right;margin-top:2px">' + qp.done + '/' + qp.total + '</div></div></div>';
    } else if (S.currentQuest && S.currentQuest.completed) {
      html += '<div class="card" style="border-color:rgba(34,197,94,.3);text-align:center;padding:20px">🎉 <strong>Weekly Quest อาทิตย์นี้เสร็จแล้ว!</strong></div>';
    }

    // Recent
    html += '<div class="card"><div class="card-title">🕐 บันทึกล่าสุด</div>' + recentHtml + '</div>';

    el.innerHTML = html;
  }

  function renderLogForm() {
    var el = document.getElementById('logFormPanel');
    if (!el) return;
    var opts = ACT_TYPES.map(function(a) { return '<option value="' + a.id + '">' + a.emoji + ' ' + a.name + '</option>'; }).join('');
    el.innerHTML = '<div class="card"><div class="card-title">📝 จดบันทึกการเรียนรู้</div>'
      + '<div class="form-group"><label>ประเภทกิจกรรม</label><select class="form-select" id="logType">' + opts + '</select></div>'
      + '<div class="form-group"><label>ระยะเวลา (นาที)</label><input class="form-input" type="number" id="logDuration" min="1" value="15" /></div>'
      + '<div class="form-group"><label>สิ่งที่เรียน</label><input class="form-input" type="text" id="logDesc" placeholder="คำศัพท์เรื่อง สอบ, บทที่ 3 ..." /></div>'
      + '<div class="form-group"><label>รายละเอียด</label><textarea class="form-textarea" id="logDetails" placeholder="คำศัพท์, สรุป, โน้ต..."></textarea></div>'
      + '<button class="btn btn-primary" onclick="window.addLogEntry()">✅ บันทึก</button></div>'
      + '<div class="card"><div class="card-title">💰 เหรียญที่คาดว่าจะได้</div><div style="font-size:28px;font-weight:700;text-align:center;color:#fbbf24" id="coinPreview">0 🪙</div></div>';
  }

  function renderLogList() {
    var el = document.getElementById('logListContent');
    if (!el) return;
    if (!S.logs.length) {
      el.innerHTML = '<div class="empty-state"><span class="icon">💤</span><p>ยังไม่มีบันทึก</p></div>';
      return;
    }
    var groups = {}, order = [];
    S.logs.forEach(function(l) {
      if (!groups[l.date]) { groups[l.date] = []; order.push(l.date); }
      groups[l.date].push(l);
    });
    var html = '';
    order.forEach(function(date) {
      html += '<div class="card" style="padding:12px 16px"><div class="card-title" style="font-size:11px;margin-bottom:6px">' + date + '</div>';
      groups[date].forEach(function(l) {
        var a = actByType(l.type);
        html += '<div class="log-item" style="padding:8px 0"><div class="log-icon">' + a.emoji + '</div><div class="log-body"><div class="log-type">' + a.name + '</div><div class="log-desc">' + l.description + '</div>';
        if (l.details) html += '<div class="log-detail">' + l.details + '</div>';
        html += '<div class="log-detail">' + l.time + ' · ' + l.duration + ' นาที</div></div><div class="log-coins">+' + l.coins + '</div></div>';
      });
      html += '</div>';
    });
    el.innerHTML = html;
  }

  function renderShop() {
    var el = document.getElementById('shopContent');
    if (!el) return;
    var html = '<div class="card" style="text-align:center;padding:20px"><div style="font-size:13px;color:#64748b">เหรียญปัจจุบัน</div><div style="font-size:32px;font-weight:700;margin:6px 0;color:#fbbf24">🪙 ' + fmt(S.coins) + '</div></div><div class="shop-grid">';
    S.shopItems.forEach(function(item) {
      html += '<div class="shop-item' + (item.purchased ? ' owned' : '') + '" onclick="' + (item.purchased ? 'window.resetShop(\'' + item.id + '\')' : 'window.purchase(\'' + item.id + '\')') + '">';
      html += '<span class="emoji">' + item.emoji + '</span>';
      html += '<div class="name">' + item.name + '</div>';
      html += '<div class="price">' + (item.purchased ? '✅ ซื้อแล้ว' : '🪙 ' + item.price) + '</div></div>';
    });
    html += '</div>';
    html += '<div class="card" style="margin-top:10px"><div class="card-title">📖 กติกา</div>'
      + '<ul style="font-size:12px;color:#64748b;padding-left:16px;line-height:1.8">'
      + '<li>สะสมเหรียญจากการเรียนภาษาเกาหลี</li>'
      + '<li>ใช้เหรียญซื้อของกินที่อยากกิน</li>'
      + '<li>ซื้อแล้ว = อนุญาตให้กินของนั้นได้</li>'
      + '<li>แตะของที่ซื้อแล้วเพื่อรีเซ็ต (กินหมดแล้ว)</li>'
      + '</ul></div>';
    el.innerHTML = html;
  }

  function renderQuests() {
    var el = document.getElementById('questsContent');
    if (!el) return;
    if (!S.currentQuest) { el.innerHTML = '<div class="empty-state"><span class="icon">📋</span><p>ไม่มีเควสประจำสัปดาห์</p></div>'; return; }
    var qp = qProgress();
    var html = '<div class="quest-banner"><div class="title">📋 Weekly Quest</div><div class="sub">' + S.currentQuest.msg + '</div>'
      + '<div style="margin-top:8px"><div class="progress-bar" style="background:rgba(0,0,0,.2)"><div class="progress-fill" style="width:' + qp.pct + '%;background:linear-gradient(90deg,#a78bfa,#22d3ee)"></div></div>'
      + '<div style="font-size:11px;opacity:.6;text-align:right;margin-top:2px">' + qp.done + '/' + qp.total + '</div></div></div>';
    html += '<div class="card">';
    S.currentQuest.items.forEach(function(item) {
      html += '<div class="quest-item">';
      html += '<div class="quest-check' + (item.done ? ' done' : '') + '">' + (item.done ? '✓' : '') + '</div>';
      html += '<div class="quest-info"><div class="desc">' + item.desc + '</div>';
      html += '<div class="prog">' + item.progress + ' / ' + item.target + ' ' + item.unit + '</div></div>';
      html += '<div class="quest-reward">+' + item.reward + '🪙</div></div>';
    });
    html += '</div>';
    if (S.currentQuest.completed) html += '<div class="card" style="text-align:center;padding:20px;border-color:rgba(34,197,94,.3)">🎉 เควสอาทิตย์นี้เสร็จหมดแล้ว!</div>';
    el.innerHTML = html;
  }

  function renderStats() {
    var el = document.getElementById('statsContent');
    if (!el) return;
    calcStreak();
    var counts = {}, durs = {};
    ACT_TYPES.forEach(function(a) { counts[a.id] = 0; durs[a.id] = 0; });
    S.logs.forEach(function(l) {
      if (counts[l.type] !== undefined) { counts[l.type]++; durs[l.type] += l.duration; }
    });
    var maxC = 1;
    for (var k in counts) { if (counts[k] > maxC) maxC = counts[k]; }
    var colors = ['#22d3ee', '#22c55e', '#fbbf24', '#a78bfa', '#f472b6', '#fb923c', '#38bdf8'];
    var html = '<div class="stat-row">'
      + '<div class="stat-box"><span class="num">' + S.stats.totalStudyDays + '</span><div class="label">วันที่เรียน</div></div>'
      + '<div class="stat-box"><span class="num">' + Math.floor(S.stats.totalStudyMinutes / 60) + 'ชม.</span><div class="label">เวลาเรียนรวม</div></div>'
      + '<div class="stat-box"><span class="num">' + S.stats.vocabCount + '</span><div class="label">คำศัพท์</div></div>'
      + '</div>';

    // Streak
    html += '<div class="card"><div class="card-title">🔥 Streak</div>'
      + '<div class="streak-display"><div class="streak-num">' + S.streak + '</div><div class="streak-label">วันติดต่อกัน</div>'
      + '<div style="font-size:12px;color:#64748b;margin-top:4px">ยาวนานที่สุด: ' + S.longestStreak + ' วัน</div></div>'
      + '<div class="streak-bar">';
    for (var i = 0; i < 7; i++) {
      var ds = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      var has = false;
      for (var j = 0; j < S.logs.length; j++) { if (S.logs[j].date === ds) { has = true; break; } }
      html += '<div class="streak-day' + (has ? ' active' : '') + '">' + new Date(ds).getDate() + '</div>';
    }
    html += '</div></div>';

    // Skill breakdown
    html += '<div class="card"><div class="card-title">📊 ทักษะแยกตามประเภท</div>';
    ACT_TYPES.forEach(function(a, idx) {
      var pct = maxC > 0 ? Math.round((counts[a.id] || 0) / maxC * 100) : 0;
      html += '<div class="progress-label"><span>' + a.emoji + ' ' + a.name + '</span><span>' + (counts[a.id] || 0) + ' ครั้ง</span></div>';
      html += '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%;background:' + colors[idx % colors.length] + '"></div></div>';
    });
    html += '</div>';

    // Economics
    html += '<div class="card"><div class="card-title">💰 เศรษฐศาสตร์</div>'
      + '<div class="progress-label"><span>🪙 เหรียญทั้งหมดที่เคยได้</span><span>' + fmt(S.totalEarned) + ' 🪙</span></div>'
      + '<div class="progress-label"><span>🪙 เหรียญปัจจุบัน</span><span>' + fmt(S.coins) + ' 🪙</span></div>'
      + '<div class="progress-label"><span>🪙 ใช้ไปแล้ว</span><span>' + fmt(S.totalEarned - S.coins) + ' 🪙</span></div>'
      + '</div>';
    el.innerHTML = html;
  }

  // ─── Global exports ───
  window.addLogEntry = function() {
    var type = document.getElementById('logType');
    var dur = document.getElementById('logDuration');
    var desc = document.getElementById('logDesc');
    var det = document.getElementById('logDetails');
    if (!desc || !desc.value.trim()) { toast('⚠️ กรุณากรอกสิ่งที่เรียน'); return; }
    addLog(type.value, parseInt(dur.value) || 15, desc.value, det.value);
    desc.value = ''; det.value = '';
  };
  window.purchase = function(id) { purchase(id); };
  window.resetShop = function(id) { resetShop(id); };
  window.switchTab = switchTab;

  // Live coin preview
  document.addEventListener('change', function(e) {
    if (e.target.id === 'logType' || e.target.id === 'logDuration') {
      var type = document.getElementById('logType');
      var dur = document.getElementById('logDuration');
      var prev = document.getElementById('coinPreview');
      if (type && dur && prev) prev.textContent = calcCoins(type.value, parseInt(dur.value) || 0) + ' 🪙';
    }
  });
  document.addEventListener('input', function(e) {
    if (e.target.id === 'logDuration') {
      var type = document.getElementById('logType');
      var dur = document.getElementById('logDuration');
      var prev = document.getElementById('coinPreview');
      if (type && dur && prev) prev.textContent = calcCoins(type.value, parseInt(dur.value) || 0) + ' 🪙';
    }
  });

  // ─── Init ───
  load();
  calcStreak();
  genQuest();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderAll);
  } else {
    renderAll();
  }
})();
