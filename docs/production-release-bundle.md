# Production Release Bundle

Tài liệu này mô tả bộ thư mục chuẩn để upload lên Google Drive hoặc chia sẻ nội bộ cho đội triển khai cửa hàng.

## Mục tiêu

- chuẩn hoá bộ file phát hành cho mỗi đợt rollout
- giảm lỗi do thiếu file hoặc đưa nhầm version
- giúp nhân viên cửa hàng chỉ làm đúng vài bước đơn giản

## Cấu trúc thư mục đề xuất

```text
production-release/
  <release-id>/
    00-imager/
    01-golden-image/
    02-store-configs/
    03-staff-guide/
    04-release-notes/
    05-checklists/
    README.md
```

## Ý nghĩa từng thư mục

- `00-imager/`
  - đặt `Raspberry Pi Imager` hoặc công cụ flash được công ty duyệt
- `01-golden-image/`
  - đặt file `golden image` đã test thật trên Pi 5
- `02-store-configs/`
  - đặt các file `showcase-device.json` cho từng cửa hàng hoặc từng kiosk
- `03-staff-guide/`
  - đặt tài liệu ngắn cho nhân viên cửa hàng
- `04-release-notes/`
  - đặt release notes của đợt phát hành này
- `05-checklists/`
  - đặt checklist xác nhận kỹ thuật trước khi ship

## Quy ước đặt tên nên dùng

- golden image:
  - `sony-showcase-golden-image-2026-04-09.img.xz`
- release folder:
  - `2026-04-09-kiosk-release`
- store config:
  - `showcase-device-hcm-q1-03.json`

## Script tạo bundle

Repo có sẵn script:

```bash
pnpm run kiosk:prepare-release -- 2026-04-09-kiosk-release
```

Script sẽ tạo:

- thư mục release trong `dist/production-release/`
- `README.md` mô tả bundle
- copy sẵn:
  - `docs/quick-start-store-staff.md`
  - `docs/release-notes-template.md`
  - `docs/production-release-checklist.md`
  - `config/device.template.json`

## Copy thêm file thật vào bundle

Sau khi script chạy, bạn chép thêm:

- `Raspberry Pi Imager` vào `00-imager/`
- `golden image` vào `01-golden-image/`
- file config của từng cửa hàng vào `02-store-configs/`

## Lưu ý phát hành

- mỗi bundle chỉ chứa một version release
- luôn giữ một bundle rollback gần nhất
- trước khi upload, xác nhận file đúng với release notes
