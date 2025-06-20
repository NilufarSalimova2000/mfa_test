// foydalanuvchi local storagega saqlanadi
let users = JSON.parse(localStorage.getItem('users')) || {};
let isRegisterMode = false;
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const regName = document.getElementById('reg-name');
const regEmail = document.getElementById('reg-email');
const regUsername = document.getElementById('reg-username');
const regPassword = document.getElementById('reg-password');
const submitBtn = document.getElementById('submit-btn');
const regSubmitBtn = document.getElementById('reg-submit-btn');
const toggleFormBtn = document.getElementById('toggle-form');
const message = document.getElementById('message');
const formTitle = document.getElementById('form-title');

// validatsiya- login parol uchun
function validateInput(username, password, isRegister = false) {
    const usernameRegex = /^(?=.*[a-zA-Z])(?=.*[0-9])[a-zA-Z0-9]{8,}$/;
    const passwordRegex = /^[0-9]{4}$/;

    const userInput = isRegister ? regUsername : usernameInput;
    const passInput = isRegister ? regPassword : passwordInput;

    userInput.classList.remove('input-error', 'input-success');
    passInput.classList.remove('input-error', 'input-success');

    let valid = true;

    if (!usernameRegex.test(username)) {
        message.textContent = "Login kamida 8 belgi, harf va raqamlar aralash bo'lishi kerak!";
        userInput.classList.add('input-error');
        valid = false;
    } else {
        userInput.classList.add('input-success');
    }

    if (!passwordRegex.test(password)) {
        message.textContent = "Parol faqat 4 raqamdan iborat bo'lishi kerak!";
        passInput.classList.add('input-error');
        valid = false;
    } else {
        passInput.classList.add('input-success');
    }

    return valid;
}

// validatsiya email uchun
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// face-api.js kutubxonasining kerakli model fayllarini yuklash uchun
async function loadModels() {
    try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models/'); // yuzni tez aniqlash
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models/'); // yuz nuqtalarini aniqlash (ko‘z, burun, og‘iz)
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models/'); // yuz descriptor (raqamli ifoda) olish
        message.textContent = "Modellar yuklandi. Ma'lumotlarni kiriting.";
        message.classList.remove('success');
    } catch (err) {
        message.textContent = "Modellarni yuklashda xato: " + err.message;
        console.error("Model yuklash xatosi:", err);
    }
}

// kamera orqali videoni ishga tushirish
async function startVideo() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } }
        });
        video.srcObject = stream;
        video.style.display = 'block';
        canvas.style.display = 'block';
        await video.play();
        return true;
    } catch (err) {
        message.textContent = 'Kamera ishga tushmadi: ' + err.message;
        console.error("Kamera xatosi:", err);
        return false;
    }
}

// Video oqimdagi yuzni aniqlab, yuzning descriptor’ini qaytaradi.
// Descriptor — bu yuzning raqamli “izidir” identifikatsiya uchun ishlatiladi.
async function getFaceDescriptor() {
    try {
        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
        const detections = await faceapi.detectSingleFace(video, options)
            .withFaceLandmarks()
            .withFaceDescriptor();
        if (!detections) {
            message.textContent = "Yuz aniqlanmadi! Iltimos, kameraga qarang, yorug'likni yaxshilang va masofani 50-70 sm qiling.";
            return null;
        }
        return detections.descriptor;
    } catch (err) {
        message.textContent = "Yuz aniqlashda xato: " + err.message;
        console.error("Yuz aniqlash xatosi:", err);
        return null;
    }
}

// Ikki yuz descriptor orasidagi o‘xshashlikni o‘lchaydi
function compareFaces(descriptor1, descriptor2) {
    try {
        const distance = faceapi.euclideanDistance(descriptor1, descriptor2);
        return distance < 0.8;
    } catch (err) {
        message.textContent = "Yuzlarni solishtirishda xato: " + err.message;
        console.error("Yuz solishtirish xatosi:", err);
        return false;
    }
}

// Foydalanuvchini ro‘yxatdan o‘tkazadi
async function register() {
    const name = regName.value.trim();
    const email = regEmail.value.trim();
    const username = regUsername.value.trim();
    const password = regPassword.value.trim();

    if (!name || !email || !username || !password) {
        message.textContent = "Barcha maydonlarni to'ldirish majburiy!";
        return;
    }

    if (!validateEmail(email)) {
        message.textContent = "Noto'g'ri email formati!";
        return;
    }

    if (!validateInput(username, password, true)) return;

    if (users[username]) {
        message.textContent = "Bu login allaqachon mavjud!";
        return;
    }

    const videoStarted = await startVideo();
    if (!videoStarted) return;

    message.textContent = "Yuz aniqlanmoqda...";
    const descriptor = await getFaceDescriptor();
    if (!descriptor) return;

    users[username] = {
        name,
        email,
        password,
        faceDescriptor: Array.from(descriptor)
    };
    localStorage.setItem('users', JSON.stringify(users));
    message.textContent = "Ro'yxatdan o'tish muvaffaqiyatli! Iltimos, login qiling.";
    message.classList.add('success');
    video.style.display = 'none';
    canvas.style.display = 'none';
    registerForm.classList.remove('active');
    loginForm.classList.add('active');
    formTitle.textContent = "Kirish";
}

// logindan o'tkazadi
async function login() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
        message.textContent = "Login va parol kiritilishi shart!";
        return;
    }

    if (!validateInput(username, password)) return;

    if (!users[username]) {
        message.textContent = "Bunday login mavjud emas!";
        return;
    }

    if (users[username].password !== password) {
        message.textContent = "Parol noto'g'ri!";
        return;
    }

    const videoStarted = await startVideo();
    if (!videoStarted) return;

    message.textContent = "Yuz aniqlanmoqda...";
    const descriptor = await getFaceDescriptor();
    if (!descriptor) return;

    const storedDescriptor = new Float32Array(users[username].faceDescriptor);
    if (compareFaces(descriptor, storedDescriptor)) {
        message.textContent = "Tizimga muvaffaqiyatli kirdingiz!";
        message.classList.add('success');
        window.location.href = 'dashboard.html';
    } else {
        message.textContent = "Yuz mos kelmadi!";
    }
    video.style.display = 'none';
    canvas.style.display = 'none';
}

// Login formasi va ro‘yxatdan o‘tish formasini o‘zaro almashadi
function toggleForm() {
    isRegisterMode = !isRegisterMode;
    if (isRegisterMode) {
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
        formTitle.textContent = "Ro'yxatdan o'tish";
        toggleFormBtn.textContent = "Kirish";
    } else {
        registerForm.classList.remove('active');
        loginForm.classList.add('active');
        formTitle.textContent = "Kirish";
        toggleFormBtn.textContent = "Ro'yxatdan o'tish";
    }
    message.textContent = "";
    message.classList.remove('success');
    usernameInput.value = "";
    passwordInput.value = "";
    regName.value = "";
    regEmail.value = "";
    regUsername.value = "";
    regPassword.value = "";
    video.style.display = 'none';
    canvas.style.display = 'none';
}

submitBtn.addEventListener('click', async () => {
    message.textContent = "Tekshirilmoqda...";
    message.classList.remove('success');
    await login();
});

regSubmitBtn.addEventListener('click', async () => {
    message.textContent = "Tekshirilmoqda...";
    message.classList.remove('success');
    await register();
});

toggleFormBtn.addEventListener('click', toggleForm);

if (typeof faceapi === 'undefined') {
    message.textContent = "face-api.js yuklanmadi. Internet aloqangizni tekshiring.";
    console.error("face-api.js yuklanmadi.");
} else {
    loadModels();
}
