# SPYTEE TeePublic Extension v0.3

## Cài vào Chrome

1. Mở `chrome://extensions`.
2. Bật **Developer mode / Chế độ dành cho nhà phát triển**.
3. Bấm **Load unpacked / Tải tiện ích đã giải nén**.
4. Chọn thư mục `extension` trong dự án SPYTEE (thư mục chứa manifest.json).
5. Ghim SPYTEE lên thanh công cụ bằng biểu tượng Extensions.

## Quét dữ liệu

1. Mở trang tìm kiếm, danh mục hoặc chi tiết thiết kế trên https://www.teepublic.com.
2. Đợi trang tải xong. Nếu có xác minh, hoàn thành trong trình duyệt.
3. Cuộn để tải thêm sản phẩm nếu cần.
4. Bấm icon SPYTEE rồi **Quét trang hiện tại**.
5. Bảng SPYTEE hiện ngay bên phải trang TeePublic: Top Tags, người bán, sản phẩm và ô lọc. Có nút Copy Top Tags, Thu gọn và Đóng. Không cần xuất JSON để xem dữ liệu.
6. Bấm **Hiện bảng trên trang TeePublic** trong popup để mở lại kết quả của cùng trang. Khi đổi trang, cần quét lại. Extension giữ 30 phiên gần nhất trên trình duyệt này.
7. Nếu cần xem trên dashboard, bấm **Mở SPYTEE để nhận kết quả trực tiếp**.
8. Trên dashboard `/teepublic-extension`, bấm **Nhận kết quả trực tiếp từ extension**. Không cần xuất JSON.
9. JSON và CSV vẫn có thể xuất để dự phòng hoặc phân tích thêm.

## Kết nối dashboard

Content script chỉ chạy trên `https://spytee.vercel.app` và localhost/127.0.0.1 phục vụ phát triển.
Dashboard chỉ nhận phiên quét gần nhất khi bạn bấm nút nhận kết quả; dữ liệu lưu trong trình duyệt.
Không tự tải lại TeePublic, không sao chép cookie, không gửi phiên đăng nhập lên Vercel.
Ngày quét gốc được giữ nguyên khi chuyển dữ liệu. Cùng một phiên quét không bị lưu trùng.
Sau khi nâng cấp extension, bấm Reload tại chrome://extensions rồi tải lại cả trang SPYTEE.

Khi phát triển local, chạy `npm.cmd run dev` trong thư mục dự án và mở URL Vite in ra, thêm `/teepublic-extension`.
Link production trong popup chỉ dùng được sau khi bản dashboard mới đã được deploy.

## Phạm vi dữ liệu

- Chỉ quét trang đang mở khi người dùng bấm nút. Không tải hàng loạt trang, không tự chuyển trang.
- Không đọc cookie, mật khẩu hoặc token. Không tự gửi dữ liệu; dashboard chỉ nhận kết quả khi bạn bấm nút nhận.
- Chỉ xin activeTab, scripting, storage; không có quyền truy cập mọi website.
- Sản phẩm được nhận diện từ URL TeePublic có ID thiết kế. Một thiết kế lặp trong cùng section chỉ ghi một lần.
- Best Sellers / Trending Today chỉ gắn nhãn khi thấy heading tương ứng trên trang. Không chia danh sách theo giả định 16/28.
- Main Tag/người bán để trống khi không đọc được. Không suy ra tag từ title hoặc description.
- Top Tags đếm số thiết kế riêng biệt có tag trong mẫu, không phải search volume hay doanh số.
- Giao diện TeePublic thay đổi có thể cần cập nhật selector. Trang chưa tải đủ hoặc không có tag sẽ có ít dữ liệu.
- Các snapshot lưu cục bộ; không tự đồng bộ giữa máy, trình duyệt hoặc người dùng.

## Cập nhật

Sau khi thay file, vào `chrome://extensions` và bấm **Reload** ở SPYTEE. Dữ liệu đang lưu được giữ lại.
