// --- 1. DỮ LIỆU & CONFIG ---
// Lưu ý: Thay link 'trailer' bằng link S3 Cloudfly của bạn (.mp4)
const DEFAULT_MOVIES = [
    { 
        id: 1, title: "Godzilla x Kong: Đế chế mới", tags: ["C13", "Hành động"], rating: 9.5, time: 115, 
        poster: "https://image.tmdb.org/t/p/w500/tMefBSflR6PGQLv7WvFPpKLZkyk.jpg",
        trailer: "https://s3.cloudfly.vn/movie/Godzilla x Kong _ Đế Chế Mới _ Official Trailer.mp4" 
    },
    { 
        id: 2, title: "Kung Fu Panda 4", tags: ["P", "Hoạt hình"], rating: 9.2, time: 94, 
        poster: "https://image.tmdb.org/t/p/w500/kDp1vUBnMpe8ak4rjgl3cLELqjU.jpg",
        trailer: "https://s3.cloudfly.vn/movie/KUNG FU PANDA 4 _ Trailer Lồng tiếng Việt _ Vietnamese Trailer _ KC_ 08.03.2024.mp4"
    },
    { 
        id: 3, title: "Dune: Part Two", tags: ["C16", "Viễn tưởng"], rating: 9.8, time: 166, 
        poster: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
        trailer: "https://s3.cloudfly.vn/movie/Dune_ Part Two _ Official Trailer.mp4"
    },
    { 
        id: 4, title: "Mai", tags: ["C18", "Tâm lý"], rating: 9.0, time: 131, 
        poster: "https://upload.wikimedia.org/wikipedia/vi/8/85/Mai_film_poster.jpg",
        trailer: "https://s3.cloudfly.vn/movie/MAI [First Look Trailer] - Một bộ phim mới của Trấn Thành - Khởi chiếu mùng 1 Tết 2024.mp4"
    }
];
const COMBOS = [
    { id: 'c1', name: "iCombo 1 (1 Bắp + 1 Nước)", price: 79000, img: "https://www.galaxycine.vn/media/2023/11/22/combo-1_1669085812423.jpg" },
    { id: 'c2', name: "iCombo 2 (1 Bắp + 2 Nước)", price: 99000, img: "https://www.galaxycine.vn/media/2023/11/22/combo-2_1669085820358.jpg" }
];

// State quản lý
let state = {
    user: localStorage.getItem('user'),
    movies: JSON.parse(localStorage.getItem('movies')) || DEFAULT_MOVIES,
    booking: { step: 1, movie: null, seats: [], combos: {}, total: 0 },
    bookedSeats: JSON.parse(localStorage.getItem('bookedSeats')) || {},
    history: JSON.parse(localStorage.getItem('ticketHistory')) || [],
    timerInterval: null
};

const $ = (id) => document.getElementById(id);
const formatMoney = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

// --- 2. INIT & NAV ---
window.onload = () => {
    // Fake loading 0.8s
    setTimeout(() => {
        $('preloader').style.opacity = '0';
        setTimeout(() => $('preloader').style.display = 'none', 500);
    }, 800);

    renderMovies(state.movies);
    renderShowtimes();
    checkAuth();
};

function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${pageId}`).classList.add('active');
    
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    document.querySelector(`[data-page="${pageId}"]`)?.classList.add('active');
    
    if (pageId === 'mytickets') renderHistory();
    if (pageId === 'admin') loadAdminTab('movies');
    if (pageId !== 'booking') clearInterval(state.timerInterval); // Dừng timer nếu thoát trang đặt vé
    
    window.scrollTo(0,0);
}

function toggleMobileMenu() {
    document.querySelector('.mobile-menu').classList.toggle('active');
    document.querySelector('.mobile-menu-overlay').classList.toggle('active');
}
function mobileNav(page) {
    toggleMobileMenu();
    switchPage(page);
}

// --- 3. TRAILER VIDEO PLAYER (HTML5) ---
function playTrailer(url) {
    if (!url) return alert("Phim này chưa cập nhật Trailer!");
    const player = $('videoPlayer');
    const source = $('videoSource');
    
    source.src = url;
    player.load();
    $('modalTrailer').style.display = 'flex';
    player.play();
}

function closeTrailer() {
    const player = $('videoPlayer');
    player.pause();
    player.currentTime = 0;
    $('modalTrailer').style.display = 'none';
}

// --- 4. TRANG CHỦ & TÌM KIẾM ---
function searchMovie() {
    const keyword = $('searchInput').value.toLowerCase();
    const filtered = state.movies.filter(m => m.title.toLowerCase().includes(keyword));
    renderMovies(filtered);
}

function renderMovies(movieList) {
    const grid = $('moviesGrid');
    if (movieList.length === 0) {
        grid.innerHTML = '<p style="color:#aaa">Không tìm thấy phim.</p>';
        return;
    }
    grid.innerHTML = movieList.map(m => `
        <div class="movie-card">
            <div class="poster-container" onclick="selectMovie(${m.id})">
                <img src="${m.poster}" loading="lazy">
                <div class="rating-badge" style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.8); padding:5px; border-radius:4px; font-weight:bold"><i class="fas fa-star" style="color:gold"></i> ${m.rating}</div>
                <div class="tag ${m.tags[0].toLowerCase()}" style="position:absolute; top:10px; left:10px">${m.tags[0]}</div>
            </div>
            <div class="card-content">
                <h3>${m.title}</h3>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:5px">
                    <p style="color:#94a3b8; margin:0">${m.time} phút</p>
                    <button class="btn-secondary" style="padding:5px 10px; font-size:0.7rem" onclick="playTrailer('${m.trailer}')"><i class="fas fa-play"></i> Trailer</button>
                </div>
            </div>
        </div>
    `).join('');
}

// --- 5. BOOKING & TIMER ---
function selectMovie(id) { switchPage('showtimes'); }

function initBooking(movieId, time) {
    if (!state.user) return openLoginModal();
    const movie = state.movies.find(m => m.id === movieId);
    state.booking = { step: 1, movie, time, seats: [], combos: {}, total: 0 };
    
    // UI Updates
    $('cartPoster').src = movie.poster;
    $('cartTitle').textContent = movie.title;
    $('cartInfo').textContent = `Rạp 01 | ${time}`;
    $('mobileMovieTitle').textContent = movie.title;
    
    $('step-seat').style.display = 'block';
    $('step-food').style.display = 'none';
    $('step-pay').style.display = 'none';
    $('btnBack').style.display = 'none';
    $('btnNext').textContent = "TIẾP TỤC";
    
    renderSeats(movie.id, time);
    renderCombos();
    updateCart();
    startTimer();
    switchPage('booking');
}

function startTimer() {
    clearInterval(state.timerInterval);
    let duration = 300; // 5 phút
    const display = document.querySelector('#bookingTimer span');
    
    state.timerInterval = setInterval(() => {
        let m = parseInt(duration / 60, 10);
        let s = parseInt(duration % 60, 10);
        m = m < 10 ? "0" + m : m;
        s = s < 10 ? "0" + s : s;
        display.textContent = m + ":" + s;
        
        if (--duration < 0) {
            clearInterval(state.timerInterval);
            alert("Hết thời gian giữ ghế! Vui lòng đặt lại.");
            switchPage('home');
        }
    }, 1000);
}

function renderSeats(movieId, time) {
    const showKey = `${movieId}-${time}`;
    const booked = state.bookedSeats[showKey] || [];
    let html = '';
    for(let r=1; r<=8; r++) {
        html += '<div class="row" style="justify-content:center">';
        for(let c=1; c<=10; c++) {
            const seatId = `${String.fromCharCode(64+r)}${c}`;
            let type = (r >= 7) ? 'vip' : 'std';
            let status = booked.includes(seatId) ? 'occupied' : '';
            html += `<div class="seat ${type} ${status}" onclick="toggleSeat(this, '${seatId}', '${type}')">${seatId}</div>`;
        }
        html += '</div>';
    }
    $('seatsGrid').innerHTML = html;
}

function toggleSeat(el, id, type) {
    if (el.classList.contains('occupied')) return;
    el.classList.toggle('selected');
    const price = type === 'vip' ? 110000 : 90000;
    if (el.classList.contains('selected')) {
        state.booking.seats.push({ id, price });
    } else {
        state.booking.seats = state.booking.seats.filter(s => s.id !== id);
    }
    updateCart();
}

function updateCart() {
    const seatTotal = state.booking.seats.reduce((sum, s) => sum + s.price, 0);
    const comboTotal = COMBOS.reduce((sum, c) => sum + (state.booking.combos[c.id] || 0) * c.price, 0);
    state.booking.total = seatTotal + comboTotal;
    $('cartSeats').textContent = state.booking.seats.map(s => s.id).join(', ') || '-';
    $('cartCombos').textContent = formatMoney(comboTotal);
    $('cartTotal').textContent = formatMoney(state.booking.total);
}

function renderCombos() {
    $('comboList').innerHTML = COMBOS.map(c => `
        <div style="display:flex; align-items:center; background:var(--card); padding:10px; margin-bottom:10px; border-radius:6px">
            <img src="${c.img}" style="width:60px; height:60px; object-fit:cover; border-radius:4px; margin-right:15px">
            <div style="flex:1"><h4>${c.name}</h4><b>${formatMoney(c.price)}</b></div>
            <div style="display:flex; gap:10px; align-items:center">
                <button class="btn-secondary" onclick="updCombo('${c.id}', -1)">-</button>
                <span id="q-${c.id}">0</span>
                <button class="btn-secondary" onclick="updCombo('${c.id}', 1)">+</button>
            </div>
        </div>
    `).join('');
}
function updCombo(id, n) {
    if (!state.booking.combos[id]) state.booking.combos[id] = 0;
    state.booking.combos[id] += n;
    if (state.booking.combos[id] < 0) state.booking.combos[id] = 0;
    $(`q-${id}`).textContent = state.booking.combos[id];
    updateCart();
}

// --- 6. NAVIGATE BOOKING STEPS ---
function handleNext() {
    if (state.booking.step === 1) {
        if (state.booking.seats.length === 0) return alert("Vui lòng chọn ghế!");
        state.booking.step = 2;
        $('step-seat').style.display = 'none'; $('step-food').style.display = 'block';
        $('btnBack').style.display = 'inline-block';
    } else if (state.booking.step === 2) {
        state.booking.step = 3;
        $('step-food').style.display = 'none'; $('step-pay').style.display = 'block';
        $('btnNext').textContent = "THANH TOÁN";
    } else {
        processPayment();
    }
}
function handleBack() {
    if (state.booking.step === 2) {
        state.booking.step = 1; $('step-seat').style.display = 'block'; $('step-food').style.display = 'none'; $('btnBack').style.display = 'none';
    } else if (state.booking.step === 3) {
        state.booking.step = 2; $('step-food').style.display = 'block'; $('step-pay').style.display = 'none'; $('btnNext').textContent = "TIẾP TỤC";
    }
}

// --- 7. PAYMENT & TICKET ---
function selectPayment(el) { document.querySelectorAll('.pay-item').forEach(i => i.classList.remove('active')); el.classList.add('active'); el.querySelector('input').checked = true; }

function processPayment() {
    clearInterval(state.timerInterval);
    const code = "CS-" + Math.floor(100000 + Math.random() * 900000);
    const newTicket = {
        code, movie: state.booking.movie.title, time: state.booking.time,
        date: new Date().toLocaleDateString('vi-VN'), seats: state.booking.seats.map(s => s.id).join(', '),
        total: state.booking.total
    };
    state.history.unshift(newTicket);
    localStorage.setItem('ticketHistory', JSON.stringify(state.history));
    
    // Lưu ghế đã bán
    const showKey = `${state.booking.movie.id}-${state.booking.time}`;
    if (!state.bookedSeats[showKey]) state.bookedSeats[showKey] = [];
    state.booking.seats.forEach(s => state.bookedSeats[showKey].push(s.id));
    localStorage.setItem('bookedSeats', JSON.stringify(state.bookedSeats));

    showTicketModal(newTicket);
}

function showTicketModal(ticket) {
    $('ticketMovieName').textContent = ticket.movie;
    $('ticketDate').textContent = ticket.date;
    $('ticketTime').textContent = ticket.time;
    $('ticketSeats').textContent = ticket.seats;
    $('ticketPrice').textContent = formatMoney(ticket.total);
    $('ticketCode').textContent = "#" + ticket.code;
    
    // Tạo QR Code
    $('qrcode').innerHTML = "";
    new QRCode($('qrcode'), { text: ticket.code, width: 128, height: 128 });
    
    $('modalTicket').style.display = 'flex';
}

function finishBookingFlow() {
    $('modalTicket').style.display = 'none';
    switchPage('mytickets'); // Tự động về trang vé của tôi
}
function printTicket() { window.print(); }

// --- 8. ADMIN CRUD ---
function loadAdminTab(tab) {
    if(!state.user || state.user !== 'admin') return alert('Chỉ dành cho Admin!');
    const content = $('adminContent');
    
    if (tab === 'movies') {
        content.innerHTML = `
            <h3>Quản lý phim</h3>
            <div style="margin-bottom:20px; background:#0f172a; padding:15px; border-radius:8px">
                <h4>Thêm phim mới</h4>
                <div class="form-group"><input id="newTitle" placeholder="Tên phim"></div>
                <div class="form-group"><input id="newImg" placeholder="Link ảnh Poster"></div>
                <div class="form-group"><input id="newTrailer" placeholder="Link Trailer (mp4)"></div>
                <div style="display:flex; gap:10px">
                    <input id="newTags" placeholder="Tags (VD: C13, Hành động)">
                    <input id="newTime" placeholder="Thời lượng (phút)" type="number">
                </div>
                <button class="btn-primary" onclick="addMovie()">Lưu Phim</button>
            </div>
            <table class="admin-table">
                <thead><tr><th>Poster</th><th>Tên phim</th><th>Trailer</th><th>Xóa</th></tr></thead>
                <tbody>
                    ${state.movies.map(m => `
                        <tr>
                            <td><img src="${m.poster}" style="width:40px; border-radius:4px"></td>
                            <td>${m.title}</td>
                            <td>${m.trailer ? '<i class="fas fa-check" style="color:green"></i>' : 'No'}</td>
                            <td><button class="btn-danger-sm" onclick="deleteMovie(${m.id})">Xóa</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    } else if (tab === 'stats') {
        const totalRev = state.history.reduce((sum, t) => sum + t.total, 0);
        content.innerHTML = `
            <h3>Thống kê</h3>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:20px">
                <div style="background:#0f172a; padding:20px; border-radius:8px; text-align:center">
                    <h3 style="color:var(--primary); font-size:2rem">${formatMoney(totalRev)}</h3><p>Tổng doanh thu</p>
                </div>
                <div style="background:#0f172a; padding:20px; border-radius:8px; text-align:center">
                    <h3 style="color:#fff; font-size:2rem">${state.history.length}</h3><p>Vé đã bán</p>
                </div>
            </div>`;
    }
}

function addMovie() {
    const title = $('newTitle').value;
    const poster = $('newImg').value;
    const trailer = $('newTrailer').value;
    const time = $('newTime').value;
    const tags = $('newTags').value.split(',');
    
    if(!title || !poster) return alert("Vui lòng nhập đủ thông tin!");
    
    const newMovie = {
        id: Date.now(), title, poster, time, trailer,
        tags: tags.length > 1 ? tags : ["P", "Phim mới"], rating: 9.0
    };
    state.movies.push(newMovie);
    localStorage.setItem('movies', JSON.stringify(state.movies));
    loadAdminTab('movies');
    alert("Thêm thành công!");
}

function deleteMovie(id) {
    if(confirm("Xóa phim này?")) {
        state.movies = state.movies.filter(m => m.id !== id);
        localStorage.setItem('movies', JSON.stringify(state.movies));
        loadAdminTab('movies');
    }
}
function resetSystem() {
    if(confirm("CẢNH BÁO: Xóa toàn bộ dữ liệu?")) {
        localStorage.clear();
        location.reload();
    }
}

// --- 9. UTILS & AUTH ---
function renderHistory() {
    const list = $('ticketHistoryList');
    if (state.history.length === 0) return list.innerHTML = '<p style="color:#fff">Chưa có vé nào.</p>';
    list.innerHTML = state.history.map(t => `
        <div class="history-card">
            <div class="status">Đã thanh toán</div>
            <h4>${t.movie}</h4>
            <p><i class="fas fa-calendar"></i> ${t.date} | ${t.time}</p>
            <p><i class="fas fa-couch"></i> Ghế: <b>${t.seats}</b></p>
            <p><i class="fas fa-money-bill"></i> ${formatMoney(t.total)}</p>
            <button class="btn-secondary" style="margin-top:10px; font-size:0.8rem" onclick="rePrint('${t.code}')">Xem lại vé</button>
        </div>
    `).join('');
}
function rePrint(code) { const t = state.history.find(t => t.code === code); if(t) showTicketModal(t); }

function renderShowtimes() {
    $('showtimesList').innerHTML = state.movies.slice(0,4).map(m => `
        <div style="background:var(--card); padding:15px; border-radius:8px; margin-bottom:15px; display:flex; gap:15px">
            <img src="${m.poster}" style="width:60px; height:85px; border-radius:4px; object-fit:cover">
            <div style="flex:1"><h4>${m.title}</h4>
                <div style="margin-top:10px; display:flex; gap:10px">
                    <button class="btn-secondary" onclick="initBooking(${m.id}, '19:00')">19:00</button>
                    <button class="btn-secondary" onclick="initBooking(${m.id}, '21:30')">21:30</button>
                </div>
            </div>
        </div>
    `).join('');
}

function openLoginModal() { $('modalLogin').style.display = 'flex'; }
function closeModal(id) { $(id).style.display = 'none'; }
window.onclick = function(e) { 
    if(e.target == $('modalLogin')) closeModal('modalLogin'); 
    if(e.target == $('modalTrailer')) closeTrailer();
}

function handleLogin() {
    const u = $('loginUser').value; const p = $('loginPass').value;
    if ((u === 'admin' && p === '123456') || u.length > 0) {
        state.user = u; localStorage.setItem('user', u); checkAuth(); closeModal('modalLogin');
        if(u === 'admin') switchPage('admin');
    } else alert('Sai tài khoản');
}
function logoutAdmin() { if(confirm('Đăng xuất?')) { localStorage.removeItem('user'); location.reload(); } }
function checkAuth() { if(state.user) { $('userMenuBtn').innerHTML = `<i class="fas fa-user-check"></i> ${state.user}`; $('userMenuBtn').onclick = logoutAdmin; } }