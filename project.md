
***

## 1. Mở game lần đầu

**Bước 1: Vào game từ Telegram**

- Người dùng vào bot/channel Telegram → nhấn nút **“Play”** hoặc link mini app.  
- Telegram mở một cửa sổ Web App (như một trang web nhúng trong Telegram).  
- Màn hình hiện:

  - Một nhân vật / vật thể chính ở giữa (ví dụ:  
    - “con thú”, “robot”, “hòn đá năng lượng”, “cây coin”… tùy theme).  
  - Một nút to ở giữa hoặc chính nhân vật đó là vùng để tap.  
  - Trên đầu màn hình:  
    - Số coin hiện tại (ví dụ: `0` hoặc `12.5K`).  
    - Level (ví dụ: `Level 1`).  
  - Dưới cùng: 3–4 tab nhỏ:  
    - `Tap` (màn hình chính)  
    - `Boost` (mua nâng cấp)  
    - `Quest` (nhiệm vụ / điểm danh)  
    - `Rank` (bảng xếp hạng).

**Cảm giác đầu tiên:**  
Rất đơn giản, chỉ thấy một thứ to ở giữa và số 0, người dùng hiểu ngay: “Chắc là phải bấm vào kia”.

***

## 2. Vòng lặp cơ bản: Tap → thấy số tăng → muốn tap tiếp

**Bước 2: Tap vào nhân vật / nút chính**

- Mỗi lần chạm vào nhân vật / nút giữa màn hình:
  - Coin tăng lên: `0 → 1 → 2 → 3…`  
  - Có hiệu ứng:  
    - Số `+1` bay lên rồi tan biến.  
    - Nhân vật có animation nhỏ (nhún lên, phát sáng, rung nhẹ…).  
    - Âm thanh “click” vui tai (tùy chọn).

- Ở góc màn hình có thể có:
  - Thanh năng lượng (Energy): `100/100`, mỗi lần tap trừ 1 energy.  
  - Khi energy về 0 → không tap được nữa cho đến khi hồi (ví dụ: 1 energy/giây).

**Người chơi nghĩ:**  
“Ok, bấm vào đây là ra coin, càng bấm càng nhiều, có thanh năng lượng nên không spam vô tận được.”

***

## 3. Mua boost đầu tiên: cảm giác “mạnh lên”

Sau khi tap một lúc, coin đủ để mua nâng cấp.

**Bước 3: Vào tab Boost**

- Người dùng nhấn tab `Boost` ở dưới.  
- Màn hình hiện danh sách các gói boost, ví dụ:

  - `Power Tap` – Tăng coin mỗi lần tap:  
    - Hiện tại: `+1 coin/tap`  
    - Gói 1: `+2 coin/tap` – giá `500 coin`  
    - Gói 2: `+3 coin/tap` – giá `2.000 coin`  
  - `Auto Miner` – Tự sinh coin mỗi giây:  
    - Hiện tại: `0 coin/s`  
    - Gói 1: `+1 coin/s` – giá `1.000 coin`  
  - `Energy Cap` – Tăng tối đa energy:  
    - Hiện tại: `100`  
    - Gói 1: `200` – giá `800 coin`.

- Mỗi gói có nút **“Mua”**.

**Bước 4: Mua gói boost đầu tiên**

- Người dùng thấy mình có `1.200 coin` → nhấn “Mua” vào `Power Tap (Gói 1 – 500 coin)`.  
- Coin trừ ngay: `1.200 → 700`.  
- Text cập nhật:  
  - `+2 coin/tap` thay vì `+1`.  
- Quay lại màn hình `Tap`, người dùng thử tap vài cái:
  - Trước đây: mỗi tap `+1`.  
  - Bây giờ: mỗi tap `+2`.  
  - Hiệu ứng số bay lên to hơn, màu khác (ví dụ: `+2` màu xanh).

**Cảm giác:**  
“Bỏ coin ra mua là thấy mạnh lên thật, muốn cày tiếp để mua cái mạnh hơn.”

***

## 4. X2 reward bằng AdsGram: “Xem quảng cáo, nhận boost khủng hơn”

Đây là chỗ bạn gắn **AdsGram** để người dùng xem quảng cáo và được x2 / tăng boost.

### 4.1. Popup x2 sau khi mua boost

Sau khi người dùng mua boost, game có thể hiện popup:

> “Chúc mừng! Bạn vừa nâng cấp Power Tap lên +2 coin/tap.  
> Xem quảng cáo ngắn để **nâng lên +4 coin/tap trong 10 phút**?  
> [Xem ngay] [Để sau]”

- Người dùng nhấn **“Xem ngay”** → AdsGram hiển thị rewarded video.  
- Trong thời gian xem:
  - Có thể có countdown nhỏ: `00:15`, `00:14`…  
  - Nút “Skip” chỉ hiện sau vài giây (tùy AdsGram).

- Khi quảng cáo xong:
  - Popup hiện:  
    > “Đã kích hoạt **Super Power Tap**: +4 coin/tap trong 10 phút!”  
  - Hiệu ứng đặc biệt: nhân vật phát sáng, viền màu vàng, có timer `09:59` đếm ngược.

- Trong 10 phút đó:
  - Mỗi tap: `+4` thay vì `+2`.  
  - Người dùng thấy coin tăng nhanh hơn hẳn → muốn tap nhiều hơn.

### 4.2. X2 coin vừa kiếm (alternate cách dùng AdsGram)

Một cách khác (hoặc bổ sung):

- Sau mỗi 1–2 phút tap liên tục, game hiện thông báo nhỏ:

  > “Bạn vừa kiếm được 1.200 coin trong 1 phút qua.  
  > Xem quảng cáo để **x2 thành 2.400 coin**?  
  > [X2 ngay] [Bỏ qua]”

- Người dùng nhấn “X2 ngay” → AdsGram rewarded video.  
- Khi xong:
  - Coin được cộng thêm đúng lượng vừa kiếm (hoặc % nào đó).  
  - Có thông báo: “Đã x2 reward 1 phút gần nhất: +1.200 coin”.

**Cảm giác người chơi:**  
“Mình không mất gì ngoài 15–30s xem quảng cáo, mà được x2 coin / boost mạnh, rất hời.”

***

## 5. Điểm danh hàng ngày qua Linkvertise: “Mở khóa ngày mới”

Đây là phần **link quảng cáo (Linkvertise / shortlink monetization)** dùng như “cổng điểm danh”.

### 5.1. Khi vào game sau 24h

Giả sử người dùng đã chơi hôm qua, hôm nay quay lại:

- Khi mở app, thay vì vào thẳng màn hình tap, game hiện popup:

  > “Ngày mới đã đến!  
  > Hoàn thành **Daily Gate** để mở khóa nhiệm vụ và bonus hôm nay.  
  > [Mở Daily Gate]”

- Người dùng nhấn **“Mở Daily Gate”** → app mở một trang web bên ngoài (trong browser hoặc in-app browser):
  - Trang này redirect qua **link Linkvertise** (hoặc shortlink có ads).  
  - Người dùng xem quảng cáo / làm một vài bước đơn giản (chọn country, chờ 5s, v.v.).  
  - Sau khi xong, link redirect về một URL của bạn, ví dụ:  
    `https://yourgame.com/checkin?user_id=12345&token=XYZ`.

- Backend của bạn:
  - Kiểm tra token + user_id + thời gian.  
  - Nếu hợp lệ → đánh dấu “đã điểm danh hôm nay” và cộng bonus (ví dụ: `200 coin` + `1 lượt mở skin 24h`).

- Người dùng được redirect lại mini app, popup hiện:

  > “Đã hoàn thành Daily Gate!  
  > Nhận:  
  > - 200 coin  
  > - Mở khóa Skin: ‘Golden Robot’ trong 24h  
  > - Reset nhiệm vụ hàng ngày.”

- Quay lại màn hình `Tap`, người dùng thấy:
  - Coin tăng thêm 200.  
  - Nhân vật đổi skin (ví dụ: từ robot xám → robot vàng).  
  - Tab `Quest` có nhiệm vụ mới.

**Cảm giác:**  
“Mỗi ngày chỉ cần 20–30s xem link ads là có bonus + mở đồ mới, khá nhẹ mà vẫn thấy có tiến trình.”

***

## 6. Nhiệm vụ hàng ngày (Quest): việc để làm mỗi ngày

Tab `Quest` hiển thị danh sách nhiệm vụ hôm nay, ví dụ:

- `Tap 200 lần` – thưởng `300 coin`.  
- `Xem 1 quảng cáo` – thưởng `200 coin` (dùng AdsGram).  
- `Mời 1 bạn click vào game` – thưởng `500 coin`.  
- `Hoàn thành Daily Gate` – thưởng `200 coin` (đã làm ở bước trên).

Mỗi nhiệm vụ có:

- Thanh tiến độ: `0/200`, `0/1`.  
- Nút “Nhận thưởng” sáng lên khi hoàn thành.

**Ví dụ một lượt làm quest:**

- Người dùng tap đủ 200 lần → thanh `Tap 200 lần` đầy.  
- Nút “Nhận thưởng” sáng → nhấn vào:
  - Coin tăng thêm `300`.  
  - Nhiệm vụ chuyển trạng thái “Hoàn thành”.

- Với quest “Xem 1 quảng cáo”:
  - Người dùng nhấn “Làm” → AdsGram rewarded video.  
  - Khi xong → tự động cộng `200 coin` và đánh dấu hoàn thành.

**Cảm giác:**  
“Mỗi ngày có vài việc nhỏ, làm xong là có coin, thấy rõ tiến độ, không bị nhàm.”

***

## 7. Bảng xếp hạng & mục tiêu dài hạn

Tab `Rank` hiện:

- Top người chơi theo:
  - Tổng coin kiếm được trong tuần.  
  - Hoặc level cao nhất.  
- Vị trí của người chơi:  
  - “Bạn đang hạng #12.543 – Top 5%”.

Ở đầu hoặc cuối bảng có thông báo:

> “Top 1.000 người chơi tuần này sẽ nhận thưởng TON / Stars / quà thật.”

**Cảm giác:**  
“Mình đang ở top vài %, cố thêm chút là vào top nhận thưởng thật → muốn cày tiếp.”

***

## 8. Trải nghiệm tổng thể trong một session điển hình

Một lượt chơi điển hình của người dùng (khoảng 3–7 phút):

1. Mở game từ Telegram.  
2. Nếu là ngày mới → làm **Daily Gate** (link ads) để nhận bonus + mở khóa.  
3. Vào màn hình `Tap`, tap khoảng 1–2 phút cho đến khi hết energy hoặc chán tay.  
4. Thấy coin đủ → vào `Boost` mua nâng cấp.  
5. Sau khi mua, popup mời **xem quảng cáo để x2 boost** → người dùng xem AdsGram.  
6. Quay lại tap với boost mạnh hơn, coin tăng nhanh.  
7. Làm 1–2 quest (tap đủ số lần, xem 1 quảng cáo).  
8. Xem vị trí của mình trên `Rank`, tự nhủ “mai quay lại cày tiếp”.  
9. Thoát game, có thể share link game cho bạn qua Telegram.

***

## 9. Điểm “cuốn” chính trong góc nhìn người chơi

- **Cực kỳ dễ hiểu:** “Bấm vào đây là ra coin”.  
- **Cảm giác tiến bộ rõ:**  
  - Số coin tăng.  
  - Level lên.  
  - Boost mạnh hơn.  
  - Skin đẹp hơn.  
- **X2 reward bằng ads cảm giác “lời”:**  
  - Không bị ép xem, nhưng nếu xem thì lợi hơn hẳn.  
- **Điểm danh qua link nhẹ nhàng:**  
  - Chỉ 1 lần/ngày, 20–30s, nhưng nhận bonus + mở đồ.  
- **Có mục tiêu dài hạn:**  
  - Leo rank, vào top nhận thưởng thật.  

***

## 1. Xác định đơn vị tiền và tỷ giá cơ bản

Bạn nên tách rõ 2 loại “tiền” trong game:

1. **Coin (trong game)**  
   - Dùng để: mua boost, nâng cấp, mở skin…  
   - Là “điểm” chính người chơi thấy khi tap.

2. **Cash / Balance (tiền rút được)**  
   - Đơn vị: USD, VNĐ, hoặc USDT/TON.  
   - Chỉ tăng khi:  
     - Hoàn thành nhiệm vụ đặc biệt.  
     - Đạt mốc level/streak.  
     - Tham gia sự kiện / mùa giải.  
   - Đây là số hiển thị ở tab `Wallet` hoặc `Earn`.

### Tỷ giá cơ bản (ví dụ)

Bạn đặt một tỷ giá “neo” dễ hiểu:

- `10.000 coin = 0.01 USD` (tức là `1 USD = 1.000.000 coin`).  
- Hoặc theo VNĐ: `10.000 coin = 100 VNĐ` → `1.000.000 coin = 10.000 VNĐ`.

Trong code, bạn chỉ cần 1 biến global:

```js
const COIN_TO_USD = 1 / 1_000_000; // 1 coin = 0.000001 USD
```

Người chơi không cần hiểu công thức, chỉ cần thấy:

- “Cày 1 triệu coin ≈ 10k VNĐ”  
- “Tuần này mình kiếm được 5 triệu coin ≈ 50k VNĐ”.

***

## 2. Màn hình Wallet / Rút tiền (từ góc người chơi)

Thêm 1 tab mới: `Wallet` (hoặc `Earn`) dưới cùng, cạnh `Tap / Boost / Quest / Rank`.

### 2.1. Giao diện Wallet

Khi người dùng vào tab `Wallet`, họ thấy:

1. **Số dư Cash (rút được)**  
   - Ví dụ: `Balance: 0.45 USD` hoặc `Balance: 10.500 VNĐ`.  
   - Dưới đó có dòng nhỏ:  
     - “Quy đổi từ coin: 450.000 coin → 0.45 USD”.

2. **Số coin hiện có**  
   - `Coin: 2.350.000`.  
   - Nút: **“Đổi coin sang Cash”** (Convert).

3. **Ngưỡng rút tối thiểu**  
   - Ví dụ:  
     - “Rút tối thiểu: 5 USD (≈ 5.000.000 coin)”  
     - Hoặc: “Rút tối thiểu: 100.000 VNĐ”.

4. **Phương thức rút**  
   - TON wallet  
   - USDT (TRC20/BEP20)  
   - VNĐ qua bank / Momo (nếu bạn support).  
   - Hoặc Telegram Stars (nếu muốn đơn giản).

5. **Lịch sử rút**  
   - Danh sách:  
     - `20/09 – Rút 5 USD – TON – Thành công`  
     - `15/09 – Rút 2 USD – USDT – Đang xử lý`.

### 2.2. Quy trình đổi coin → cash (trong app)

**Bước 1: Người dùng nhấn “Đổi coin sang Cash”**

- Popup hiện:

  > “Đổi coin sang Cash  
  > - Số coin hiện có: 2.350.000  
  > - Tỷ giá: 1.000.000 coin = 1 USD  
  > - Nhập số coin muốn đổi: [_______]  
  > - Sẽ nhận được: 0.00 USD  
  > - Phí chuyển đổi: 0% (hoặc 5% nếu bạn muốn)  
  > [Đổi] [Hủy]”

- Khi người dùng nhập số coin, app tính ngay số USD nhận được.

**Bước 2: Xác nhận đổi**

- Nhấn “Đổi” → popup xác nhận:

  > “Bạn sắp đổi 1.000.000 coin → 1 USD.  
  > Coin sẽ trừ ngay, Cash sẽ cộng vào Balance.  
  > [Xác nhận] [Hủy]”

- Sau khi xác nhận:
  - Coin trừ: `2.350.000 → 1.350.000`.  
  - Balance tăng: `0.45 USD → 1.45 USD`.  
  - Có thông báo: “Đã đổi 1.000.000 coin thành 1 USD”.

**Bước 3: Rút tiền (Withdraw)**

- Khi Balance ≥ ngưỡng tối thiểu, nút **“Rút tiền”** sáng lên.  
- Nhấn vào → form rút:

  - Chọn phương thức: TON / USDT / VNĐ…  
  - Nhập địa chỉ ví / số tài khoản.  
  - Nhập số tiền muốn rút (có thể chọn “Rút hết”).  
  - Hiển thị phí rút (nếu có) và số nhận thực tế.

- Xác nhận rút → hệ thống tạo yêu cầu rút, trạng thái: `Pending`.

***

## 3. Cách kiếm Cash (chứ không chỉ coin)

Để game thực sự là “game kiếm tiền”, người chơi phải thấy rõ các cách **tăng Cash**, không chỉ coin.

### 3.1. Đổi coin → Cash (chính)

- Như mô tả ở trên:  
  - Người dùng chủ động đổi khi muốn.  
  - Bạn có thể đặt **giới hạn đổi/ngày** để kiểm soát dòng tiền.

### 3.2. Nhiệm vụ trả Cash trực tiếp

Trong tab `Quest`, có 2 loại phần thưởng:

- **Coin reward** (phổ biến).  
- **Cash reward** (ít hơn, nhưng giá trị tâm lý cao).

Ví dụ:

- “Hoàn thành Daily Gate trong 7 ngày liên tiếp” → thưởng `0.5 USD`.  
- “Mời 5 bạn đăng ký + tap tối thiểu 1.000 lần” → thưởng `1 USD`.  
- “Đạt Level 10 trong tuần này” → thưởng `0.3 USD`.

Khi hoàn thành, popup:

> “Chúc mừng! Bạn nhận 0.5 USD vào Balance.  
> Balance hiện tại: 1.20 USD.”

### 3.3. Sự kiện / mùa giải (Season)

Mỗi tuần / mỗi tháng, bạn chạy 1 “Season”:

- Top 1.000 người kiếm nhiều coin nhất → thưởng Cash theo bậc:  
  - Top 1–10: `5–20 USD`.  
  - Top 11–100: `1–5 USD`.  
  - Top 101–1.000: `0.2–1 USD`.

- Hoặc theo level:  
  - “Tuần này, mọi người chơi đạt Level ≥ 20 đều nhận 0.5 USD”.

Điều này tạo lý do để người chơi **cày mạnh từng đợt**, dễ PR:  
“Mùa 1 đang diễn ra, top 1.000 nhận tiền thật”.

***

## 4. Cân bằng kinh tế: ads + link vs tiền trả người chơi

Vì bạn quen CPC/CPM/CPA, phần này bạn sẽ thích.

### 4.1. Doanh thu ước tính từ 1 người dùng/ngày

Giả sử 1 user trung bình/ngày:

- Xem **3 rewarded ads (AdsGram)**:  
  - CPM rewarded video ~ 8–15 USD (tùy geo).  
  - 3 ads × 15s ≈ 0.0004–0.001 USD/lượt (tính sơ).  
  - Tổng: ~0.003–0.01 USD/ngày.

- Làm **1 Daily Gate (Linkvertise/shortlink)**:  
  - CPC/CPV trung bình: 0.005–0.02 USD/lượt (tùy nguồn).  
  - Bạn nhận: ~0.01 USD/ngày/user (ước an toàn).

→ Tổng doanh thu rough: **0.013–0.02 USD/ngày/user**.

### 4.2. Chi trả cho người chơi

Bạn muốn margin ~50–70%, tức là chỉ trả lại 30–50% doanh thu cho user.

Ví dụ:

- Doanh thu trung bình: 0.015 USD/ngày/user.  
- Bạn cho phép user “kiếm” trung bình: 0.005–0.007 USD/ngày.

Cách áp vào game:

- Thiết kế sao cho 1 user chăm chỉ/ngày:  
  - Đổi được khoảng **300.000–700.000 coin** → `0.3–0.7 USD`? Không, phải thấp hơn.  
  - Tốt hơn:  
    - 1 ngày cày khá: ~500.000 coin → đổi được `0.5 USD` là quá cao so với revenue.  
    - Nên để: 1 ngày cày khá → ~50.000–150.000 coin → `0.05–0.15 USD`.

Như vậy:

- Revenue: ~0.015 USD.  
- Trả user: ~0.005–0.007 USD (nếu họ đổi hết coin trong ngày).  
- Margin: ~50–65%.

Bạn có thể tinh chỉnh:

- Tăng/giảm tỷ giá `coin → USD`.  
- Giảm % coin được đổi/ngày.  
- Tăng phần thưởng Cash cho nhiệm vụ dài hạn (7 ngày, 30 ngày) để giữ retention mà không tăng cost/ngày quá nhiều.

***

## 5. Cách PR phần “rút tiền” để cuốn mà không bị “scam vibe”

Để PR mạnh mà vẫn uy tín:

1. **Công khai ngưỡng rút và phương thức**  
   - “Rút tối thiểu 5 USD qua TON/USDT.”  
   - “Thời gian xử lý: 24–72h.”

2. **Show proof (ẩn danh)**  
   - Trong tab `Wallet` có mục “Recent Payouts”:  
     - “User ***123 vừa rút 5 USD – TON – 10 phút trước.”  
   - Hoặc đăng ảnh screenshot (che info) trên channel Telegram.

3. **Dùng ngôn ngữ rõ ràng**  
   - “Coin là điểm trong game, đổi sang Cash để rút tiền thật.”  
   - “Không bắt buộc nạp tiền, chỉ chơi + xem quảng cáo là kiếm được.”

4. **Nhấn mạnh “kiếm thêm” chứ không phải “làm giàu”**  
   - “Kiếm vài USD mỗi tuần khi chơi game.”  
   - Tránh: “Kiếm trăm USD mỗi ngày” → dễ bị coi là scam.

***

## 6. Gợi ý cấu trúc dữ liệu đơn giản (để dev dễ làm)

Mỗi user trong DB có thể có:

```json
{
  "user_id": "tg_123456",
  "coin": 2350000,
  "balance_usd": 1.45,
  "level": 12,
  "daily_streak": 5,
  "last_daily_gate": "2025-09-30T19:00:00Z",
  "withdrawals": [
    {
      "id": "wd_001",
      "amount_usd": 5.0,
      "method": "TON",
      "address": "UQ...",
      "status": "completed",
      "created_at": "2025-09-20T10:00:00Z"
    }
  ]
}
```

Logic đổi coin → cash:

```js
function convertCoinToCash(user, coinAmount) {
  const rate = 1 / 1_000_000; // 1 coin = 0.000001 USD
  const feeRate = 0.0; // 0% phí
  const cash = coinAmount * rate * (1 - feeRate);
  user.coin -= coinAmount;
  user.balance_usd += cash;
}
```

***


## 1. Thiết kế lại luồng ads: 3 nguồn, mỗi nguồn 10p, total 30p cycle

Bạn nói:

- Mỗi nguồn quảng cáo có **limit tối thiểu 15p/view/người**.  
- Bạn có **3 nguồn** → có thể chia: **mỗi 10p 1 nguồn**, xoay vòng.  
- Trong lúc user tap, có thể **chèn quảng cáo nghỉ 5s**.

Ta biến thành cơ chế:

### 1.1. Khái niệm “Ad Slot” trong game

Trong game sẽ có vài vị trí hiển thị quảng cáo (ad slot):

1. **Rewarded Boost Slot**  
   - Khi user mua boost / hoàn thành quest → popup mời xem ads để x2.  
   - Đây là **rewarded video** (AdsGram hoặc nguồn 1/2/3).  

2. **Break Ad Slot (quảng cáo nghỉ 5s)**  
   - Trong lúc user đang tap, mỗi khoảng thời gian nhất định (ví dụ 2–3 phút) → hiện một popup nhỏ:  
     > “Nghỉ 5s để nhận 50 coin”  
   - Trong 5s đó, bạn có thể:  
     - Hiển thị **banner / interstitial ngắn** từ 1 trong 3 nguồn.  
     - Hoặc chỉ là countdown + logo + CTA “Tap tiếp”.  

3. **Daily Gate / Mission Ad Slot**  
   - Chính là phần **link quảng cáo (Linkvertise/shortlink)** dùng để điểm danh.  
   - Mỗi ngày 1 lần, user phải đi qua nguồn này.

### 1.2. Xoay 3 nguồn ads theo chu kỳ 30 phút

Giả sử 3 nguồn ads của bạn là:

- `Source A` (ví dụ: AdsGram)  
- `Source B` (network khác)  
- `Source C` (network khác)

Bạn đặt rule:

- **Mỗi 10 phút, chỉ gọi 1 nguồn cho rewarded/break ads**.  
- Chu kỳ:  
  - 0–10p: dùng Source A  
  - 10–20p: dùng Source B  
  - 20–30p: dùng Source C  
  - 30–40p: quay lại Source A, v.v.

Với mỗi user, backend lưu:

```json
{
  "user_id": "tg_123456",
  "last_ad_time": {
    "A": "2025-09-30T19:00:00Z",
    "B": "2025-09-30T18:50:00Z",
    "C": "2025-09-30T18:40:00Z"
  }
}
```

Logic chọn nguồn khi cần hiển thị ads:

- Khi game cần gọi rewarded/break ad:  
  - Tính thời gian hiện tại.  
  - Xác định “window 10p” hiện tại (0–10, 10–20, 20–30).  
  - Chọn nguồn tương ứng.  
  - Kiểm tra `last_ad_time` của nguồn đó:  
    - Nếu `now - last_ad_time[source] >= 10 phút` → cho phép gọi.  
    - Nếu chưa đủ → không hiện ads (hoặc hiện ads của nguồn khác nếu muốn linh hoạt hơn).

Như vậy:

- Mỗi nguồn **không bị gọi quá 1 lần/10p** với cùng 1 user → tránh vi phạm limit 15p/view.  
- Bạn vẫn **tận dụng được cả 3 nguồn** trong 30p, tăng fill rate và CPM trung bình.

***

## 2. Tích hợp “quảng cáo nghỉ 5s” vào gameplay tap

Đây là điểm rất hay: thay vì chỉ hiện ads khi user chủ động nhấn “x2 reward”, bạn **chủ động tạo break** để chèn ads mà vẫn “có lý do” cho user.

### 2.1. Cơ chế “Energy break” kèm ads

Cách làm mượt:

- Khi user tap, họ có thanh **Energy** (ví dụ 100).  
- Mỗi tap trừ 1 energy.  
- Khi energy về 0, thay vì bắt user chờ hồi từ từ, bạn hiện popup:

  > “Năng lượng cạn!  
  > Nghỉ 5s để hồi 30 energy + nhận 50 coin.  
  > [Nghỉ 5s] [Dùng gem hồi ngay]”

- Nếu user chọn “Nghỉ 5s”:  
  - Hiện màn hình:  
    - Countdown 5s to, rõ.  
    - Trong nền:  
      - Banner / interstitial ngắn từ nguồn ads đang đến lượt (A/B/C).  
      - Hoặc video rất ngắn (nếu network support).  
  - Sau 5s:  
    - Energy += 30.  
    - Coin += 50.  
    - Quay lại màn hình tap.

Cảm giác người chơi:

- Không bị “ép xem ads vô lý”, mà là “nghỉ 5s để hồi năng lượng + thưởng”.  
- Quảng cáo chỉ là nền trong 5s, không chặn gameplay quá lâu.

### 2.2. Break theo thời gian thay vì energy

Một cách khác (hoặc bổ sung):

- Mỗi **2–3 phút tap liên tục**, game tự động hiện:

  > “Tạm nghỉ 5s để nhận bonus 100 coin?  
  > [Nhận] [Bỏ qua]”

- Nếu user chọn “Nhận”:  
  - Hiện màn hình 5s có ads.  
  - Sau 5s: cộng coin, quay lại game.

Bạn có thể kết hợp:

- Break theo energy (khi hết energy).  
- Break theo thời gian (mỗi vài phút).  

Chỉ cần **giới hạn số break ads/ngày** (ví dụ 10–20 lần) để:

- Không làm người chơi khó chịu.  
- Không vượt quá giới hạn impression mà network cho phép.

***

## 3. Điều chỉnh kinh tế: coin, cash, và chi phí ads

Với 3 nguồn ads + break 5s, revenue/user/ngày sẽ tăng đáng kể so với chỉ 1 nguồn.

### 3.1. Ước tính revenue/user/ngày (thô)

Giả sử 1 user trung bình/ngày:

- **Rewarded ads**:  
  - 5–10 lượt/ngày (mua boost, x2 quest, v.v.).  
  - CPM rewarded: 8–15 USD.  
  - Revenue: ~0.01–0.03 USD/ngày.

- **Break ads (5s)**:  
  - 10–20 lượt/ngày.  
  - CPM thấp hơn, nhưng số lượng cao.  
  - Revenue: ~0.01–0.02 USD/ngày.

- **Daily Gate (link ads)**:  
  - 1 lượt/ngày.  
  - CPC/CPV: 0.005–0.02 USD.  
  - Revenue: ~0.01–0.02 USD/ngày.

Tổng: **0.03–0.07 USD/ngày/user** (tùy geo, quality traffic).

### 3.2. Chi trả cho user (coin → cash)

Bạn vẫn giữ margin ~50–65%:

- Revenue trung bình: 0.05 USD/ngày.  
- Cho phép user “kiếm” trung bình: 0.015–0.025 USD/ngày.

Cách áp vào game:

- Thiết kế để 1 user chăm chỉ/ngày:  
  - Đổi được khoảng **150.000–250.000 coin** → `0.15–0.25 USD` nếu tỷ giá 1M coin = 1 USD là quá cao.  
  - Nên để:  
    - 1 ngày cày khá: ~50.000–100.000 coin → `0.05–0.1 USD`.  
    - Trong đó, chỉ cho đổi sang cash khoảng **30–50%** → `0.015–0.05 USD`.

Phần còn lại:

- Coin dùng để mua boost, skin, tham gia sự kiện… → giữ user ở lại game, tăng lifetime value.

***

## 4. Trải nghiệm người chơi với 3 nguồn ads (vẫn mượt, không “loang loáng”)

Quan trọng: người chơi **không cần biết** bạn có 3 nguồn ads. Họ chỉ thấy:

- “Mỗi lần xem quảng cáo là có thưởng, không bị lỗi hay ‘hết lượt’ liên tục.”  
- “Quảng cáo xuất hiện có lý do: x2 reward, hồi energy, nghỉ 5s nhận bonus.”

Bạn chỉ cần:

- **Không bao giờ** hiện 2 ads cùng lúc.  
- **Không** bắt user xem rewarded video quá dày (ví dụ > 15–20/ngày).  
- Break 5s chỉ xuất hiện khi:  
  - Hết energy, hoặc  
  - Đã qua khoảng thời gian nhất định (2–3 phút).  

Nếu một nguồn ads bị lỗi / fill kém:

- Backend tự động **skip nguồn đó** trong chu kỳ hiện tại, chuyển sang nguồn kế tiếp.  
- Người chơi vẫn thấy quảng cáo bình thường, không bị “mất slot”.

***

## 5. Gợi ý triển khai kỹ thuật (ngắn, sát thực tế)

### 5.1. Backend: logic chọn nguồn ads

Pseudo-code:

```js
const AD_SOURCES = ["A", "B", "C"];
const WINDOW_MINUTES = 10;

function getCurrentSourceIndex() {
  const now = Date.now();
  const minutesFromEpoch = Math.floor(now / 60000);
  return (Math.floor(minutesFromEpoch / WINDOW_MINUTES)) % AD_SOURCES.length;
}

function canShowAd(user, source) {
  const last = user.last_ad_time[source] || 0;
  const now = Date.now();
  return (now - last) >= WINDOW_MINUTES * 60000;
}

function selectAdSource(user) {
  const currentIdx = getCurrentSourceIndex();
  const source = AD_SOURCES[currentIdx];
  if (canShowAd(user, source)) {
    return source;
  }
  // fallback: thử các nguồn khác theo vòng
  for (let i = 1; i < AD_SOURCES.length; i++) {
    const s = AD_SOURCES[(currentIdx + i) % AD_SOURCES.length];
    if (canShowAd(user, s)) return s;
  }
  return null; // không cho hiện ads lúc này
}
```

Mỗi khi cần hiện rewarded/break ad:

- Gọi `selectAdSource(user)` → trả về `A/B/C` hoặc `null`.  
- Nếu có nguồn → gọi SDK/API của nguồn đó.  
- Khi ads hoàn tất → cập nhật `user.last_ad_time[source] = Date.now()`.

### 5.2. Frontend: chèn break 5s

- Khi trigger break (hết energy hoặc timer):  
  - Hiện modal:  
    - Countdown 5s to, rõ.  
    - Khu vực hiển thị ads (banner/interstitial).  
  - Sau 5s:  
    - Cộng coin + energy.  
    - Đóng modal, quay lại game.

***

## 6. PR: cách “bán” ý tưởng 3 nguồn ads + break 5s cho user

Khi PR, bạn không cần nói chi tiết kỹ thuật, chỉ nhấn mạnh:

- “Game có cơ chế **nghỉ 5s nhận coin**, vừa chơi vừa thư giãn.”  
- “Hệ thống quảng cáo thông minh, **không spam**, mỗi ngày chỉ vài lần, nhưng thưởng xứng đáng.”  
- “Nhiều nguồn nhiệm vụ và quảng cáo, giúp **ổn định thu nhập** cho người chơi dài hạn.”

Nếu muốn “ngầu” hơn với cộng đồng làm MMO/affiliate:

- Bạn có thể share (trong channel nội bộ) rằng:  
  - “Mô hình tap + 3 nguồn ads xoay vòng 10p, break 5s, target CPM tổng > X, margin ~50–60%.”  
  - Để hút partner / nhà đầu tư nhỏ.

***
