# Quick Start For Store Staff

Tài liệu này dành cho nhân viên cửa hàng. Mục tiêu là ghi thẻ nhớ đúng cách và cắm vào Raspberry Pi 5 để kiosk tự chạy.

## Bạn cần chuẩn bị

- 1 máy tính Windows hoặc macOS
- 1 đầu đọc thẻ microSD
- 1 thẻ microSD đã được cấp cho cửa hàng
- file `golden image`
- `Raspberry Pi Imager` hoặc công cụ flash được công ty chỉ định
- nếu được cấp riêng: file `showcase-device.json` cho đúng cửa hàng

## Các bước thực hiện

### 1. Ghi image vào thẻ microSD

1. mở `Raspberry Pi Imager`
2. chọn file `golden image` do công ty cung cấp
3. chọn đúng thẻ microSD
4. bấm `Write`
5. chờ đến khi hoàn tất

## 2. Chép file config cửa hàng nếu được cấp

Nếu bộ triển khai có file `showcase-device.json`:

1. rút và cắm lại thẻ nếu cần
2. mở phân vùng `bootfs` hoặc `BOOT`
3. chép file `showcase-device.json` vào thư mục gốc của phân vùng đó
4. không đổi tên file

Nếu không có file này thì bỏ qua bước này.

## 3. Lắp vào Raspberry Pi 5

1. cắm thẻ microSD vào Raspberry Pi 5
2. cắm camera Sony USB Livestream
3. cắm mạng LAN hoặc đảm bảo Wi-Fi của cửa hàng sẵn sàng
4. cắm màn hình
5. cấp nguồn cho Pi

## 4. Kết quả đúng

Sau khi Pi khởi động:

- màn hình tự vào kiosk
- kiosk tự mở giao diện Sony Showcase
- nếu có mạng, kiosk ưu tiên dùng bản cloud
- nếu mất mạng, kiosk tự fallback sang bản local
- camera Sony USB Livestream tự nhận mà không cần chọn tay

## 5. Nếu không thấy kiosk chạy

1. chờ thêm 2 đến 5 phút cho lần boot đầu
2. kiểm tra nguồn điện và dây HDMI
3. kiểm tra camera đã cắm chưa
4. tắt nguồn, rút ra cắm lại thẻ nhớ, rồi bật lại
5. nếu vẫn lỗi, liên hệ đội kỹ thuật và gửi:
   - mã cửa hàng
   - mã kiosk nếu có
   - ảnh màn hình hiện tại

## Lưu ý

- không format lại thẻ khi chưa có hướng dẫn từ kỹ thuật
- không đổi tên file `showcase-device.json`
- không cần bàn phím hoặc chuột trong điều kiện bình thường
