/* =============================================
   바이브 카페 주문서 — script.js
   초보자도 읽을 수 있도록 한국어 주석을 자세하게 달았습니다.
   ============================================= */

/* ─────────────────────────────────────────────
   0. Supabase 접속 설정
   발급받으신 Supabase Project URL과 Anon Key를 아래에 입력해주세요.
───────────────────────────────────────────── */
const SUPABASE_URL = 'https://zkzlrschzbpkknjpnznk.supabase.co';
// ⚠️ 반드시 JWT 형식('eyJ...' 로 시작)의 anon public key를 사용해야 합니다.
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpremxyc2NoemJwa2tuanBuem5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2NDQ5MDIsImV4cCI6MjEwNjIyMDkwMn0.2CCACm86H9Gb8NInp4z-zxQazDkac02LZCREd5UBCts';

// Supabase 클라이언트 생성 (CDN으로 불러온 supabase 전역 객체 사용)
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


/* ─────────────────────────────────────────────
   1. DOM 요소 가져오기
   index.html의 id 속성을 그대로 사용합니다.
───────────────────────────────────────────── */

// 주문자 정보
const inputName     = document.getElementById('customer-name');
const inputPhone    = document.getElementById('phone');

// 음료 선택 드롭다운
const selectDrink   = document.getElementById('drink');

// 사이즈 라디오 버튼 전체 (NodeList)
const radiosSize    = document.querySelectorAll('input[name="size"]');

// 추가 옵션 체크박스 전체 (NodeList)
const checkOptions  = document.querySelectorAll('input[name="options"]');

// 수량 입력칸
const inputQuantity = document.getElementById('quantity');

// 요청사항 입력칸
const inputRequest  = document.getElementById('request');

// 예상 금액 숫자가 들어갈 <span>
const spanTotal     = document.getElementById('total-price');

// 주문 폼
const orderForm     = document.getElementById('order-form');

// 주문하기 / 다시 작성 버튼
const btnOrder      = document.getElementById('btn-order');
const btnReset      = document.getElementById('btn-reset');

// 주문 완료 확인 메시지 영역
const confirmMsg    = document.getElementById('confirm-message');

// ── 탭 관련 요소 ──────────────────────────────────
const tabOrder      = document.getElementById('tab-order');    // 주문하기 탭 버튼
const tabHistory    = document.getElementById('tab-history');  // 주문 내역 탭 버튼
const panelOrder    = document.getElementById('panel-order');  // 주문하기 패널
const panelHistory  = document.getElementById('panel-history');// 주문 내역 패널

// ── 주문 내역 관련 요소 ───────────────────────────
const orderList     = document.getElementById('order-list');        // 카드가 쌓이는 영역
const orderSummary  = document.getElementById('order-summary');     // 합계 + 지우기 버튼 영역
const orderTotalText= document.getElementById('order-total-text');  // "총 주문 금액: ..." 문구
const btnClearAll   = document.getElementById('btn-clear-all');     // 내역 모두 지우기 버튼
const orderCount    = document.getElementById('order-count');       // 탭 배지 숫자


/* ─────────────────────────────────────────────
   2. 주문 데이터 저장소
   orders 배열에 주문 객체를 쌓습니다.
   orderNo: 누적 주문 번호 (삭제해도 번호는 계속 증가)
───────────────────────────────────────────── */
let orders  = [];   // 현재 표시 중인 주문 배열
let orderNo = 0;    // 주문 번호 카운터 (삭제해도 재사용 안 함)


/* ─────────────────────────────────────────────
   3. calculateTotal() — 예상 금액 계산 함수
   반환값: 계산된 총 금액(숫자)
───────────────────────────────────────────── */
function calculateTotal() {

    // 음료 가격 읽기
    const selectedOpt = selectDrink.options[selectDrink.selectedIndex];
    const drinkPrice = selectedOpt.value === ''
        ? 0
        : parseInt(selectedOpt.dataset.price, 10);

    // 사이즈 추가 금액 읽기
    let sizePrice = 0;
    radiosSize.forEach(function(radio) {
        if (radio.checked) sizePrice = parseInt(radio.dataset.price, 10);
    });

    // 추가 옵션 총액 읽기
    let optionTotal = 0;
    checkOptions.forEach(function(checkbox) {
        if (checkbox.checked) optionTotal += parseInt(checkbox.dataset.price, 10);
    });

    // 수량 읽기
    const quantity = Math.max(1, parseInt(inputQuantity.value, 10) || 1);

    // 총 금액 계산 (음료 미선택이면 0원)
    const total = drinkPrice === 0
        ? 0
        : (drinkPrice + sizePrice + optionTotal) * quantity;

    // 화면에 표시 (천 단위 콤마)
    spanTotal.textContent = total.toLocaleString('ko-KR');

    return total;
}


/* ─────────────────────────────────────────────
   4. 실시간 금액 갱신 — 이벤트 리스너 등록
───────────────────────────────────────────── */
selectDrink.addEventListener('change', calculateTotal);

radiosSize.forEach(function(radio) {
    radio.addEventListener('change', calculateTotal);
});

checkOptions.forEach(function(checkbox) {
    checkbox.addEventListener('change', calculateTotal);
});

inputQuantity.addEventListener('input', calculateTotal);


/* ─────────────────────────────────────────────
   5. 탭 전환 함수
   누른 탭 버튼을 active로, 반대쪽 패널은 hidden으로 처리합니다.
───────────────────────────────────────────── */
function switchTab(selectedTab) {
    if (selectedTab === 'order') {
        // 주문하기 탭 활성화
        tabOrder.classList.add('active');
        tabOrder.setAttribute('aria-selected', 'true');
        tabHistory.classList.remove('active');
        tabHistory.setAttribute('aria-selected', 'false');

        panelOrder.removeAttribute('hidden');
        panelHistory.setAttribute('hidden', '');
    } else {
        // 주문 내역 탭 활성화
        tabHistory.classList.add('active');
        tabHistory.setAttribute('aria-selected', 'true');
        tabOrder.classList.remove('active');
        tabOrder.setAttribute('aria-selected', 'false');

        panelHistory.removeAttribute('hidden');
        panelOrder.setAttribute('hidden', '');

        // 탭을 열 때마다 Supabase에서 최신 주문 목록 가져오기
        fetchOrders();
    }
}

// 탭 버튼 클릭 이벤트
tabOrder.addEventListener('click', function() { switchTab('order'); });
tabHistory.addEventListener('click', function() { switchTab('history'); });


/* ─────────────────────────────────────────────
   6. fetchOrders() — Supabase에서 주문 내역 조회
   Supabase의 'cafe_menu03' 테이블에서 최신 순으로 주문 데이터를 가져옵니다.
───────────────────────────────────────────── */
async function fetchOrders() {
    try {
        const { data, error } = await supabaseClient
            .from('cafe_menu03')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('주문 내역 불러오기 실패:', error);
            renderOrders();
            return;
        }

        if (data) {
            // Supabase 컬럼 데이터를 화면 표시용 객체로 매핑
            orders = data.map(function(item, index) {
                // 시간 포맷팅 (HH:MM)
                let timeStr = '방금 전';
                if (item.created_at) {
                    const dateObj = new Date(item.created_at);
                    timeStr = String(dateObj.getHours()).padStart(2, '0') + ':' +
                              String(dateObj.getMinutes()).padStart(2, '0');
                }

                // 옵션 배열 검증 (text[] 형태)
                const optList = Array.isArray(item.options)
                    ? item.options
                    : (item.options ? [item.options] : []);

                return {
                    id: item.id,
                    no: item.id, // DB에서 자동 생성된 고유 주문 번호 (1, 2, 3...)
                    name: item.customer_name || '손님',
                    drinkName: item.drink || '음료',
                    size: item.size || 'M',
                    options: optList,
                    quantity: item.quantity || 1,
                    request: item.request || '',
                    totalPrice: item.total_price || 0,
                    time: timeStr
                };
            });
        }
    } catch (err) {
        console.error('Supabase 연동 오류:', err);
    } finally {
        // 화면 다시 그리기
        renderOrders();
    }
}


/* ─────────────────────────────────────────────
   7. renderOrders() — 주문 내역 화면 그리기
   orders 배열을 읽어 카드 목록을 생성하고 화면에 표시합니다.
───────────────────────────────────────────── */
function renderOrders() {

    // 배지 숫자 업데이트
    orderCount.textContent = orders.length;
    // 0건이면 배지 숨김, 1건 이상이면 표시 (CSS data-count 속성 활용)
    orderCount.dataset.count = orders.length;

    // 기존 목록 지우기
    orderList.innerHTML = '';

    // 주문이 없을 때 안내 문구 표시
    if (orders.length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.className = 'order-empty';
        emptyMsg.textContent = '아직 주문 내역이 없어요 ☕';
        orderList.appendChild(emptyMsg);
        orderSummary.setAttribute('hidden', '');
        return;
    }

    // 주문 카드 생성 (최신 순)
    orders.forEach(function(order) {
        const card = createOrderCard(order);
        orderList.appendChild(card);
    });

    // 합계 계산 및 표시
    const grandTotal = orders.reduce(function(sum, o) {
        return sum + o.totalPrice;
    }, 0);

    // textContent로 안전하게 텍스트 설정
    orderTotalText.textContent =
        '총 주문 금액: ' + grandTotal.toLocaleString('ko-KR') + '원 (' + orders.length + '건)';

    orderSummary.removeAttribute('hidden');
}


/* ─────────────────────────────────────────────
   8. createOrderCard() — 주문 카드 DOM 생성
   손님이 입력한 내용은 반드시 textContent로 넣어 XSS를 방지합니다.
───────────────────────────────────────────── */
function createOrderCard(order) {

    // ── 카드 컨테이너 ─────────────────────────────
    const card = document.createElement('div');
    card.className = 'order-card';
    card.dataset.id = order.id;

    // ── 취소 버튼 (카드 오른쪽 위) ───────────────
    const btnCancel = document.createElement('button');
    btnCancel.type = 'button';
    btnCancel.className = 'btn-cancel';
    btnCancel.textContent = '취소';
    btnCancel.addEventListener('click', async function() {
        const ok = confirm('#' + order.no + ' 주문을 취소하시겠습니까?');
        if (!ok) return;

        btnCancel.disabled = true;
        btnCancel.textContent = '취소 중...';

        try {
            // Supabase DB에서 해당 주문 행 삭제
            if (order.id) {
                const { error } = await supabaseClient
                    .from('cafe_menu03')
                    .delete()
                    .eq('id', order.id);

                if (error) {
                    throw error;
                }
            }

            // 최신 목록 다시 불러오기
            await fetchOrders();
        } catch (err) {
            console.error('주문 취소 에러:', err);
            alert('주문 취소에 실패했습니다: ' + (err.message || ''));
            // 로컬 목록이라도 갱신
            orders = orders.filter(function(o) { return o.id !== order.id; });
            renderOrders();
        }
    });
    card.appendChild(btnCancel);

    // ── 1행: 주문번호 · 이름 · 금액 ──────────────
    const header = document.createElement('p');
    header.className = 'order-card-header';
    header.textContent =
        '#' + order.no + ' ' + order.name + '님 · ' +
        order.totalPrice.toLocaleString('ko-KR') + '원';
    card.appendChild(header);

    // ── 2행: 음료명 사이즈 (옵션) N잔 ──────────
    const body = document.createElement('p');
    body.className = 'order-card-body';
    const optText = order.options.length > 0
        ? ' (' + order.options.join(', ') + ')'
        : '';
    body.textContent =
        order.drinkName + ' ' + order.size + '사이즈' + optText + ' ' + order.quantity + '잔';
    card.appendChild(body);

    // ── 3행: 요청사항(있을 때만) + 주문 시간 ────
    const footer = document.createElement('p');
    footer.className = 'order-card-footer';
    let footerText = order.time;
    if (order.request) {
        footerText = '요청: ' + order.request + '  ·  ' + order.time;
    }
    footer.textContent = footerText;
    card.appendChild(footer);

    return card;
}


/* ─────────────────────────────────────────────
   9. 주문하기 버튼 클릭 처리 (Supabase 저장 연동)
───────────────────────────────────────────── */
orderForm.addEventListener('submit', async function(event) {
    event.preventDefault(); // 페이지 새로고침 방지

    // ── 9-1. 유효성 검사 ──────────────────────────
    const name = inputName.value.trim();
    if (name === '') {
        alert('이름을 입력해주세요');
        inputName.focus();
        return;
    }

    if (selectDrink.value === '') {
        alert('음료를 선택해주세요');
        selectDrink.focus();
        return;
    }

    // ── 9-2. 주문 정보 수집 ──────────────────────
    const phone = inputPhone.value.trim();

    const selectedOption = selectDrink.options[selectDrink.selectedIndex];
    const drinkText = selectedOption.text;
    const drinkName = drinkText.replace(/\s*\(.*\)/, '').trim();
    const drinkPrice = parseInt(selectedOption.dataset.price, 10) || 0;

    let sizeValue = 'M';
    radiosSize.forEach(function(radio) {
        if (radio.checked) sizeValue = radio.value;
    });

    const selectedOptions = [];
    checkOptions.forEach(function(checkbox) {
        if (checkbox.checked) {
            const labelEl = document.querySelector('label[for="' + checkbox.id + '"]');
            const labelText = labelEl
                ? labelEl.textContent.replace(/\s*\(\+.*\)/, '').trim()
                : checkbox.value;
            selectedOptions.push(labelText);
        }
    });

    const quantity   = Math.max(1, parseInt(inputQuantity.value, 10) || 1);
    const request    = inputRequest.value.trim();
    const totalPrice = calculateTotal();

    // ── 9-3. 주문 확인 메시지 문구 조합 ────────────
    const optionText = selectedOptions.length > 0
        ? ' (' + selectedOptions.join(', ') + ')'
        : '';

    const message =
        name + '님, ' +
        drinkName + ' ' + sizeValue + '사이즈' + optionText + ' ' +
        quantity + '잔, 총 ' +
        totalPrice.toLocaleString('ko-KR') + '원 주문이 접수되었습니다!';

    // ── 9-4. 주문하기 버튼 비활성화 (중복 클릭 방지) ─
    btnOrder.disabled = true;
    const originalBtnText = btnOrder.textContent;
    btnOrder.textContent = '주문 저장 중...';

    try {
        // ── 9-5. Supabase 'cafe_menu03' 테이블에 주문 저장 ──
        const { error } = await supabaseClient
            .from('cafe_menu03')
            .insert([
                {
                    customer_name: name,
                    phone: phone,
                    drink: drinkName,
                    drink_price: drinkPrice,
                    size: sizeValue,
                    options: selectedOptions, // 옵션 배열 전달
                    quantity: quantity,
                    request: request,
                    total_price: totalPrice
                }
            ]);

        if (error) {
            throw error;
        }

        // ── 9-6. 저장 성공 시: 확인 메시지 화면 표시 ─
        confirmMsg.textContent = message;
        confirmMsg.removeAttribute('hidden');
        confirmMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // ── 9-7. Supabase에서 최신 주문 목록 다시 불러와서 내역 및 배지 갱신 ─
        await fetchOrders();

    } catch (err) {
        console.error('주문 저장 실패 (Supabase 에러 상세):', err);
        const errorDetail = err.message || (typeof err === 'string' ? err : JSON.stringify(err));
        alert('주문 저장에 실패했어요:\n[' + errorDetail + ']\n\n※ 브라우저 개발자 도구(F12) 콘솔(Console)에서 자세한 내용을 확인할 수 있습니다.');
    } finally {
        btnOrder.disabled = false;
        btnOrder.textContent = originalBtnText;
    }
});


/* ─────────────────────────────────────────────
   10. 다시 작성 버튼 — 폼만 초기화 (주문 내역 유지)
───────────────────────────────────────────── */
btnReset.addEventListener('click', function() {
    orderForm.reset();      // 폼 입력값을 HTML 기본값으로 초기화
    calculateTotal();       // 예상 금액 0원으로 갱신

    // 주문 확인 메시지 숨기기
    confirmMsg.setAttribute('hidden', '');
    confirmMsg.textContent = '';
});


/* ─────────────────────────────────────────────
   11. 내역 모두 지우기 버튼
───────────────────────────────────────────── */
btnClearAll.addEventListener('click', async function() {
    const ok = confirm('주문 내역을 모두 삭제하시겠습니까?');
    if (!ok) return;

    btnClearAll.disabled = true;
    const origText = btnClearAll.textContent;
    btnClearAll.textContent = '삭제 중...';

    try {
        // Supabase DB의 cafe_menu03 테이블 전체 삭제
        const { error } = await supabaseClient
            .from('cafe_menu03')
            .delete()
            .neq('customer_name', ''); // 전체 행 대상

        if (error) {
            throw error;
        }

        // 최신 목록 갱신
        await fetchOrders();
    } catch (err) {
        console.error('전체 삭제 실패:', err);
        orders = [];
        renderOrders();
    } finally {
        btnClearAll.disabled = false;
        btnClearAll.textContent = origText;
    }
});


/* ─────────────────────────────────────────────
   12. 페이지 처음 로드 시 초기화
───────────────────────────────────────────── */
calculateTotal();  // 예상 금액 0원으로 초기 표시
fetchOrders();     // Supabase에 저장되어 있던 주문 내역 즉시 불러오기

