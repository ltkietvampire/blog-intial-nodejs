3.1. Kịch bản kiểm thử
3.1.1. KTT-001: Đăng nhập và phân quyền hệ thống
Mục đích: Kiểm tra chức năng đăng nhập với các vai trò khác nhau (Employee, Manager, Director, Admin) và xác minh quyền truy cập.
Điều kiện tiên quyết: Hệ thống đã được cài đặt và khởi động. Cơ sở dữ liệu đã có sẵn các tài khoản kiểm thử cho mỗi vai trò.
Các bước thực hiện:
1. Truy cập trang đăng nhập với URL `/login`. Kết quả mong đợi là hệ thống hiển thị form đăng nhập đầy đủ.
2. Đăng nhập với tài khoản Admin. Kết quả mong đợi là hệ thống chuyển hướng đến Dashboard dành cho Admin và hiển thị đầy đủ các menu cấu hình hệ thống, quản lý tài khoản.
3. Đăng xuất và đăng nhập với tài khoản Employee (Nhân viên). Kết quả mong đợi là chuyển hướng đến trang "My Tasks" (Công việc của tôi).
4. Kiểm tra quyền Employee bằng cách cố gắng truy cập URL `/admin/dashboard` hoặc `/managers/salary-approval`. Kết quả mong đợi là bị chặn và hiển thị thông báo "Không có quyền truy cập".
5. Đăng nhập với tài khoản Manager (Quản lý). Kết quả mong đợi là chuyển hướng đến Dashboard Quản lý, hiển thị các menu quản lý công việc và duyệt lương cấp 1.
6. Đăng nhập với tài khoản Director (Giám đốc). Kết quả mong đợi là chuyển hướng đến Dashboard Giám đốc, hiển thị thống kê tổng quan và menu duyệt lương cấp 2.
Tiêu chí đánh giá: Hệ thống phân quyền chính xác theo vai trò (Role-Based Access Control). Không cho phép truy cập trái phép vào các route không được cấp quyền.

3.1.2. KTT-002: Quản lý thông tin Nhân viên
Mục đích: Kiểm tra chức năng thêm, sửa, xóa thông tin nhân viên bởi Admin.
Điều kiện tiên quyết: Đăng nhập với tài khoản Admin.
Các bước thực hiện:
1. Truy cập trang Quản lý nhân viên. Kết quả mong đợi là hiển thị danh sách nhân viên hiện tại.
2. Thêm nhân viên mới với đầy đủ thông tin (Tên, Email, Chức vụ, Phòng ban). Kết quả mong đợi là tạo tài khoản thành công và nhân viên xuất hiện trong danh sách.
3. Chỉnh sửa thông tin nhân viên (đổi phòng ban hoặc chức vụ). Kết quả mong đợi là thông tin được cập nhật thành công trên hệ thống.
4. Xóa một tài khoản nhân viên chưa có dữ liệu công việc. Kết quả mong đợi là xóa thành công.
5. Cố gắng xóa một nhân viên đang có công việc được giao hoặc có bảng lương. Kết quả mong đợi là hệ thống cảnh báo (ngăn chặn xóa).
Tiêu chí đánh giá: Các chức năng CRUD (Create, Read, Update, Delete) nhân viên hoạt động ổn định. Đảm bảo toàn vẹn dữ liệu hệ thống (Audit logs, Tasks liên quan).

3.1.3. KTT-003: Quản lý Công việc - Giao việc cho nhân viên
Mục đích: Kiểm tra quy trình Manager tạo và giao công việc cho Employee.
Điều kiện tiên quyết: Đăng nhập với tài khoản Manager. Đã có nhân viên thuộc quyền quản lý.
Các bước thực hiện:
1. Truy cập danh sách công việc (`/tasks`). Kết quả mong đợi là hiển thị bảng công việc của phòng ban.
2. Chọn "Thêm công việc mới", nhập Tiêu đề, Mô tả, Thời hạn (Deadline) và Chọn nhân viên thực hiện (Assignee). Kết quả mong đợi là công việc được tạo thành công với trạng thái "Assigned" (Đã giao).
3. Kiểm tra thông báo bên phía nhân viên. Kết quả mong đợi: Nhân viên nhận được thông báo về công việc mới.
4. Sửa công việc vừa tạo (thay đổi Deadline). Kết quả mong đợi là công việc được cập nhật.
5. Xóa công việc. Kết quả mong đợi là xóa thành công nếu nhân viên chưa bắt đầu thực hiện.
Tiêu chí đánh giá: Công việc được tạo và phân công chính xác. Dữ liệu thời gian được lưu đúng múi giờ.

3.1.4. KTT-004: Tương tác, bình luận và báo cáo tiến độ công việc
Mục đích: Kiểm tra tính năng Employee cập nhật tiến độ, báo cáo sự cố và thảo luận qua bình luận (Comments) trên API mới decoupled.
Điều kiện tiên quyết: Đăng nhập với tài khoản Employee. Có công việc đang được giao.
Các bước thực hiện:
1. Truy cập `My Tasks` và click vào một công việc. Kết quả mong đợi là hiển thị chi tiết công việc.
2. Thay đổi trạng thái công việc từ "Assigned" sang "In-Progress". Kết quả mong đợi là trạng thái cập nhật ngay lập tức.
3. Thêm một bình luận (Comment) bào cáo tiến độ và đính kèm 1 file (mảng JSON attachments). Kết quả mong đợi là bình luận được lưu vào CSDL và tự động load lên giao diện, file đính kèm xem được.
4. Manager xem chi tiết công việc đó. Kết quả mong đợi là Manager thấy được trạng thái thay đổi và bình luận của nhân viên vừa tạo.
Tiêu chí đánh giá: Quản lý phân quyền chính xác: Nhân viên có thể comment trực tiếp thông qua `/api/tasks` mà không cần quyền cấp quản lý. File đính kèm dạng JSON array được xử lý lưu trữ hoặc parse hiển thị đúng.

3.1.5. KTT-005: Xử lý yêu cầu thay đổi công việc (Đổi ca / Gia hạn)
Mục đích: Kiểm tra phân loại và xét duyệt yêu cầu liên quan đến Task (TASK_CHANGE_TYPES).
Điều kiện tiên quyết: Đăng nhập tài khoản Employee để tạo yêu cầu; Manager để duyệt.
Các bước thực hiện:
1. Từ Employee, tạo một yêu cầu "Gia hạn deadline" cho Task A. Kết quả mong đợi là request được sinh ra ở trạng thái "Chờ duyệt", liên kết đúng Task A và loại request.
2. Manager đăng nhập, xem danh sách yêu cầu. Kết quả mong đợi là thấy yêu cầu "Gia hạn deadline" từ Employee.
3. Manager chọn "Từ chối" và nhập lý do. Kết quả mong đợi là trạng thái yêu cầu chuyển thành "Bị từ chối". Task A vẫn giữ nguyên deadline cũ.
4. Employee tiếp tục tạo yêu cầu "Đổi ca trực" sang ngày khác và Manager "Chấp nhận". Kết quả mong đợi: Yêu cầu chuyển thành "Đã duyệt", dữ liệu ca trực trên hệ thống được cập nhật tương ứng.
Tiêu chí đánh giá: Các loại `TASK_CHANGE_TYPES` được mapping chính xác, quy trình审批 (approval) hoạt động đúng nghiệp vụ và thay đổi được cập nhật có đồng bộ vào Task / Lịch biểu.

3.1.6. KTT-006: Tính và Quản lý Bảng lương tháng (Monthly Payroll)
Mục đích: Kiểm tra chức năng tự động hoặc thủ công tổng hợp bảng lương tháng dựa trên ca làm/công việc hoàn thành.
Điều kiện tiên quyết: Đến chu kỳ tính lương, nhân viên đã có dữ liệu làm việc trong tháng. Đăng nhập với Manager hoặc Admin.
Các bước thực hiện:
1. Kích hoạt tính năng tổng hợp lương tháng (Chạy batch job hoặc nhấn nút tổng hợp). Kết quả mong đợi là Dữ liệu bảng lương nháp (Draft) của từng nhân viên được tạo.
2. Kiểm tra chi tiết định mức, hệ số nghỉ phép và lương của nhân viên X. Kết quả mong đợi là con số thực lĩnh khớp với công thức dự kiến.
3. Manager xem danh sách lương tháng qua menu Quản lý lương. Kết quả mong đợi là hiển thị danh sách các bảng lương nháp đang ở trạng thái cần Manager xác nhận.
Tiêu chí đánh giá: Hệ thống tính toán lương, dữ liệu logic chính xác, lưu bảng lương dựa trên bảng dữ liệu chấm công thật.

3.1.7. KTT-007: Quy trình Duyệt lương hai cấp (Manager & Director)
Mục đích: Kiểm tra luồng phê duyệt lương bắt buộc qua hai cấp quản lý.
Điều kiện tiên quyết: Đã có bảng lương chuẩn bị duyệt. Tài khoản Manager và Director sẵn sàng.
Các bước thực hiện:
1. Manager đăng nhập, chọn danh sách lương tháng của team mình, nhấn "Duyệt" (Approve). Kết quả mong đợi là trạng thái bảng lương chuyển từ `Draft/Pending Manager` sang `Pending Director`.
2. Giám đốc (Director) đăng nhập, truy cập Dashboard duyệt lương. Kết quả mong đợi là thấy danh sách các bảng lương đã được Manager team duyệt.
3. Director chọn "Từ chối" (Reject) một bảng lương và ghi chú "Tính lại hệ thống KPI". Kết quả mong đợi là trạng thái bị lùi lại, Manager/Kế toán nhận được thông báo phản hồi.
4. Sau khi sửa, tiến hành duyệt lại bởi Manager, sau đó Director nhấn "Phê duyệt sơ bộ/Chính thức". Kết quả mong đợi là bảng lương chuyển hẳn sang `Approved/Paid`, người lao động có thể vào nhận hóa đơn điện tử/thông báo lương.
Tiêu chí đánh giá: Bắt buộc tuân thủ đúng bước duyệt quy định trong ApprovalService. Trạng thái không thể bị "nhảy cóc" từ Draft lên thẳng Director Approved.

3.1.8. KTT-008: Ghi nhận và kiểm tra Audit Logs
Mục đích: Đảm bảo mọi tác vụ nhảy cảm (Duyệt lương, xóa tài khoản, sửa công việc) đều được ghi nhận (Ai thao tác với ai, lúc nào).
Điều kiện tiên quyết: Các tác vụ trên hệ thống vừa thực hiện xong ở các bước trên. Đăng nhập Admin.
Các bước thực hiện:
1. Admin truy cập trang `Audit Logs` / Nhật ký hệ thống. Kết quả mong đợi là danh sách nhật ký hiển thị rõ ràng.
2. Lọc theo hành động "Duyệt lương". Kết quả mong đợi là thấy chi tiết dòng Log: Director A đã duyệt lương cho Employee B vào ngày giờ cụ thể.
3. Kiểm tra các Foreign Keys. Kết quả mong đợi là trường "Performer" trỏ đúng về ID của Director, và "Target User" trỏ đúng về ID bảng lương hoặc ID của Employee B.
Tiêu chí đánh giá: Hệ thống ghi log toàn vẹn, Audit logs không bị thiếu thông tin nguồn hoặc đích, hỗ trợ tốt cho việc truy vết sau này.

3.1.9. KTT-009: Tích hợp AI Chatbot (Just-Chat) và n8n Workflow
Mục đích: Kiểm tra khả năng tương tác của Frontend "Just-Chat" tích hợp trong hệ thống với Backend/n8n.
Điều kiện tiên quyết: Hệ thống Frontend, API Node.js, và Container n8n đang hoạt động ổn định.
Các bước thực hiện:
1. Bấm vào biểu tượng Chatbot tích hợp ở góc phải màn hình hệ thống. Kết quả mong đợi là popup giao diện Just-Chat hiện lên.
2. Gửi một câu hỏi như "Xin hỏi chính sách lương làm thêm giờ?". Kết quả mong đợi là payload truy vấn được gửi đến n8n workflow thông qua API và trả về câu trả lời chính xác trong giây lát.
3. Kiểm tra lịch sử chat context bằng cách hỏi "Bạn có thể nhắc lại câu vừa rồi không?". Kết quả mong đợi là Bot nhớ context và phản hồi chuẩn xác.
Tiêu chí đánh giá: API chat không bị CORS lỗi, phản hồi từ bot nhanh chóng và giao diện chatbot hiển thị đẹp, mượt mà.  

3.1.10. KTT-010: Cấu hình giao diện và Widget Hệ thống
Mục đích: Kiểm tra chức năng cấu hình giao diện chatbot / UI của hệ thống (Configurations).
Điều kiện tiên quyết: Đăng nhập quyền Admin.
Các bước thực hiện:
1. Truy cập trang Cấu hình hệ thống (Settings -> Chatbot Appearance). Kết quả mong đợi là hiển thị các tuỳ chọn màu sắc, logo.
2. Đổi màu giao diện Chatbot thành "Xanh lá". Kết quả mong đợi là cài đặt được lưu vào Cấu hình (Configuration Table) và UI Chatbot ngoài trang chủ lập tức bị đổi sang Xanh lá theo biến CSS mới.
3. Đổi tên hiển thị của Chatbot thành "Trợ lý nội bộ". Kết quả mong đợi là giao diện chat cập nhật tên Tittle ngay lập tức hoặc sau khi reload.
Tiêu chí đánh giá: Biến cấu hình áp dụng lên được Frontend thành công và lưu vững chắc ở Backend.

3.1.11. Luồng nghiệp vụ hoàn chỉnh (End-to-End Test)
Mục đích: Đảm bảo luồng làm việc trơn tru xuyên suốt các module từ Giao việc đến Trả lương.
Các bước thực hiện:
1. Manager đăng nhập, lên danh sách Task cho nhân viên X trong tháng. (Công việc được ghi nhận).
2. Nhân viên X đăng nhập, thực hiện Task, cập nhật trạng thái liên tục và thảo luận các vướng mắc qua Comment trên API.
3. Nhân viên X gửi một yêu cầu Request Change về gia hạn thời gian do quá tải, được Manager duyệt (Trạng thái và Log được lưu).
4. Cuối tháng, hệ thống chạy lệnh tính lương, ghi nhận hoàn thành đủ số giờ/Task.
5. Manager xem lại, bấm duyệt lương cấp 1.
6. Director đăng nhập, kiểm tra và bấm duyệt lương cấp 2. (Trạng thái lương thành Final).
7. Admin xuất báo cáo Audit Log kiểm tra thấy toàn bộ hành vi của Manager X, Employee X và Director trong tháng đều minh bạch.
8. Nhân viên X vào bảng điều khiển cá nhân, thấy phiếu lương đã duyệt, chat với Bot AI để thắc mắc các điều khoản hoặc hỏi ngày nhận tiền.
Tiêu chí đánh giá: Dữ liệu chảy xuyên suốt thiết kế kiến trúc hệ thống (DFD chuẩn xác), Audit log khớp hành vi, không ai lạm quyền trong bất cứ khâu nào. Mọi thao tác đều đúng Logic.

3.1.12. KTT-012: Kiểm thử Bảo mật và Xác thực dữ liệu đầu vào (Security & Validation)
Mục đích: Đảm bảo hệ thống an toàn trước các lỗ hổng cơ bản và dữ liệu rác.
Điều kiện tiên quyết: Trang tạo công việc hoặc Comment đang mở.
Các bước thực hiện:
1. Thử nhập mã độc XSS `<script>alert('hack')</script>` vào trường Tiêu đề công việc hoặc nội dung Comment. Kết quả mong đợi là hệ thống mã hóa ký tự (Escape) hoặc báo lỗi, không thực thi mã độc.
2. Thử truy cập API sinh lương hoặc API Manager (VD: `/api/manager/salaries`) bằng JWT Token của Employee. Kết quả mong đợi là trả về HTTP 403 Forbidden.
3. Chờ quá thời gian hết hạn của JWT Token (VD: 24h) và click một menu. Kết quả mong đợi là hệ thống tự động yêu cầu đăng nhập lại (hoặc Refresh Token âm thầm thành công).
Tiêu chí đánh giá: Form nhập liệu được Validate chặt chẽ. Cơ chế phân quyền cấp API với JWT hoạt động đúng.

3.1.13. KTT-013: Xử lý ngoại lệ và chịu lỗi với AI Chatbot (Fault Tolerance)
Mục đích: Kiểm tra tính năng chịu lỗi cơ bản theo yêu cầu hệ thống khi n8n workflow gặp sự cố.
Điều kiện tiên quyết: Tắt container n8n hoặc ngắt kết nối mạng của Backend tới n8n.
Các bước thực hiện:
1. Đăng nhập tài khoản và mở giao diện Just-Chat.
2. Gửi một tin nhắn bất kỳ cho bot. Kết quả mong đợi là API đợi timeout (VD: tối đa 5-10s) và trả về thông báo lịch sự trên UI Chat: "Xin lỗi, hiện tại trợ lý AI đang bận hoặc quá tải. Vui lòng thử lại sau." thay vì crash ứng dụng.
3. Mở lại n8n và gửi tin nhắn lần nữa. Kết quả mong đợi là bot phản hồi bình thường.
Tiêu chí đánh giá: Hệ thống Backend handle được exception `ECONNREFUSED` hoặc tương tự từ n8n, đảm bảo frontend không bị treo.

3.1.14. KTT-014: Tìm kiếm, Lọc và Thống kê Nhân viên (Employee Statistics)
Mục đích: Kiểm tra khả năng hiển thị và load dữ liệu của báo cáo thống kê.
Điều kiện tiên quyết: Đăng nhập với quyền Director hoặc Admin (có thể truy cập Controller Statistics).
Các bước thực hiện:
1. Truy cập trang Thống kê/Báo cáo nhân viên. Kết quả mong đợi là hiển thị biểu đồ và danh sách tổng quan.
2. Sử dụng form Lọc dữ liệu: Lọc nhân viên theo "Phòng ban" hoặc "Trạng thái công việc hoàn thành trong tháng". Kết quả mong đợi là danh sách cập nhật trực tiếp theo query hợp lệ.
3. Nếu có tính năng Xuất file (Export) PDF/Excel, nhấn Export. Kết quả mong đợi là file tải về thành công và chứa dữ liệu khớp với dữ liệu trên màn hình.
Tiêu chí đánh giá: Truy vấn DB lấy thống kê nhanh, không quá tải. File Export đúng định dạng UTF-8.

3.1.15. KTT-015: Quản lý File đính kèm trong Task và Comment
Mục đích: Kiểm tra khả năng upload và tải file an toàn.
Điều kiện tiên quyết: Đăng nhập quyền Employee.
Các bước thực hiện:
1. Cập nhật Comment với file đính kèm quá dung lượng cho phép (>5MB). Kết quả mong đợi là hệ thống chặn và báo "File tải lên vượt quá dung lượng cho phép".
2. Cập nhật Comment đính kèm file nguy hiểm (.exe, .bat). Kết quả mong đợi là báo lỗi "Định dạng file không được hỗ trợ".
3. Tải lên file ảnh (.jpg, .png) hoặc tài liệu (.pdf) hợp lệ. Kết quả mong đợi là upload thành công và sinh ra URL lưu trữ vào mảng JSON attachments trong DB.
Tiêu chí đánh giá: Logic upload chặn đúng định dạng rủi ro, kiểm soát dung lượng. Dữ liệu attachments dạng JSON Array lưu cấu trúc chính xác.

3.1.16. KTT-016: Quản lý Thông báo Hệ thống (Announcements)
Mục đích: Kiểm tra chức năng tạo, hiển thị và quản lý thông báo nội bộ từ Admin/Manager gửi đến nhân viên.
Điều kiện tiên quyết: Đăng nhập với tài khoản Admin hoặc Manager. Đã có ít nhất một nhân viên thuộc quyền quản lý.
Các bước thực hiện:
1. Admin truy cập trang Quản lý Thông báo (`/announcements`). Kết quả mong đợi là hiển thị danh sách các thông báo hiện tại (nếu có).
2. Tạo thông báo mới với tiêu đề "Lịch nghỉ lễ 30/4", nội dung chi tiết và chọn đối tượng nhận là "Toàn bộ nhân viên". Kết quả mong đợi là thông báo được lưu và xuất hiện trong danh sách.
3. Đăng nhập tài khoản Employee và kiểm tra trang thông báo. Kết quả mong đợi là nhân viên thấy thông báo "Lịch nghỉ lễ 30/4" đã được gửi đến.
4. Admin xóa hoặc chỉnh sửa thông báo vừa tạo. Kết quả mong đợi là thông báo được cập nhật/xóa thành công, phía Employee không còn thấy thông báo đã xóa.
Tiêu chí đánh giá: Thông báo được phân phối đúng đối tượng. Middleware thông báo hoạt động ổn định, không ảnh hưởng đến hiệu năng các route khác.

3.1.17. KTT-017: Kiểm thử Hiệu năng và Tải đồng thời (Performance & Concurrency)
Mục đích: Đánh giá khả năng hệ thống xử lý nhiều yêu cầu đồng thời mà không bị lỗi hoặc dữ liệu sai lệch.
Điều kiện tiên quyết: Hệ thống đang chạy ổn định. Chuẩn bị sẵn dữ liệu Mock (ít nhất 50 nhân viên, 100 công việc) đã được seed vào CSDL.
Các bước thực hiện:
1. Sử dụng công cụ kiểm thử tải (Apache JMeter hoặc tương đương) giả lập 20 người dùng đồng thời truy cập trang Danh sách công việc (`/tasks`). Kết quả mong đợi là thời gian phản hồi trung bình dưới 2 giây, không có request nào trả về lỗi 5xx.
2. Giả lập 5 Manager đồng thời duyệt các bảng lương khác nhau cùng một lúc. Kết quả mong đợi là mỗi bảng lương được cập nhật độc lập, không xảy ra tranh chấp dữ liệu (race condition).
3. Thực hiện truy vấn xuất báo cáo thống kê (`/employee/statistics/export`) trong khi hệ thống đang có nhiều người dùng hoạt động. Kết quả mong đợi là file export được sinh ra thành công và không làm chậm các yêu cầu khác.
Tiêu chí đánh giá: Hệ thống duy trì tính nhất quán dữ liệu dưới tải cao. Không xảy ra deadlock hoặc memory leak trong quá trình kiểm thử.

3.1.18. KTT-018: Kiểm thử Giao diện Responsive và Trải nghiệm Người dùng (UI/UX)
Mục đích: Xác minh giao diện hệ thống hiển thị chính xác và thân thiện trên các thiết bị và kích thước màn hình khác nhau.
Điều kiện tiên quyết: Hệ thống đang hoạt động. Sử dụng trình duyệt Chrome/Firefox với DevTools để giả lập các kích thước màn hình.
Các bước thực hiện:
1. Mở hệ thống trên màn hình Desktop (1920x1080). Kết quả mong đợi là sidebar, bảng dữ liệu, biểu đồ và các nút chức năng hiển thị đầy đủ, không bị tràn layout.
2. Dùng DevTools giả lập màn hình Tablet (768x1024). Kết quả mong đợi là sidebar thu gọn hoặc chuyển sang menu hamburger, nội dung tự căn chỉnh phù hợp.
3. Giả lập màn hình Mobile (375x667 - iPhone SE). Kết quả mong đợi là các bảng dữ liệu chuyển sang dạng cuộn ngang hoặc dạng card, form nhập liệu vẫn sử dụng được, chatbot widget không che khuất nội dung chính.
4. Kiểm tra luồng đăng nhập → Xem công việc → Thêm bình luận trên Mobile. Kết quả mong đợi là toàn bộ luồng thực hiện được mà không cần zoom hoặc cuộn ngang bất hợp lý.
Tiêu chí đánh giá: Giao diện tuân thủ thiết kế Responsive, các thành phần UI không bị vỡ layout trên các kích thước màn hình phổ biến. Trải nghiệm người dùng nhất quán và trực quan trên mọi thiết bị.

3.1.19. KTT-019: Tìm kiếm, Lọc và Thao tác hàng loạt trên Danh sách Nhân viên (Client-Side Filter & Bulk Actions)
Mục đích: Kiểm tra chức năng tìm kiếm theo từ khóa, lọc theo trạng thái/vị trí và các thao tác hàng loạt (bulk actions) trên trang quản lý nhân viên — toàn bộ xử lý tại phía trình duyệt mà không cần tải lại trang.
Điều kiện tiên quyết: Đăng nhập với tài khoản Admin. Danh sách nhân viên đã có ít nhất 5 nhân viên với trạng thái và vị trí khác nhau.
Các bước thực hiện:
1. Truy cập trang Quản lý nhân viên (`/employee`). Kết quả mong đợi là toàn bộ danh sách nhân viên hiển thị, ô thống kê (Total, Active, Busy, Off) hiển thị đúng số lượng tương ứng.
2. Nhập từ khóa "nguyen" vào ô tìm kiếm. Kết quả mong đợi là bảng lập tức lọc và chỉ hiển thị các nhân viên có tên, email, số điện thoại hoặc vị trí chứa "nguyen" (kể cả dạng "Nguyễn" có dấu), dòng thống kê "Showing X of Y members" cập nhật đúng — không có request nào gửi lên server.
3. Kết hợp tìm kiếm từ khóa với dropdown "Status = Active". Kết quả mong đợi là chỉ hiển thị các nhân viên thỏa mãn đồng thời cả hai điều kiện (tên khớp VÀ đang Active).
4. Chọn dropdown "Position" để lọc theo một vị trí cụ thể (ví dụ: "Kế toán"). Kết quả mong đợi là danh sách hiển thị đúng nhân viên thuộc vị trí đó.
5. Nhấn nút "Clear filters". Kết quả mong đợi là tất cả bộ lọc được đặt lại về mặc định và toàn bộ danh sách hiển thị trở lại.
6. Tích chọn nhiều nhân viên bằng checkbox, sau đó dùng tính năng "Bulk Status" để đổi trạng thái hàng loạt. Kết quả mong đợi là thanh công cụ Bulk Actions hiện ra, nút "Apply status" chỉ kích hoạt khi đã chọn nhân viên và chọn trạng thái, sau khi submit trang reload và trạng thái được cập nhật đúng.
7. Tích chọn nhiều nhân viên và nhấn "Delete selected". Kết quả mong đợi là hộp thoại xác nhận hiện ra, sau khi xác nhận hệ thống chỉ xóa các nhân viên không có ràng buộc dữ liệu (task đang làm hoặc lương chưa trả), và hiển thị thông báo kết quả rõ ràng.
Tiêu chí đánh giá: Toàn bộ chức năng lọc hoạt động tức thì tại trình duyệt (không reload trang). Hàm normalizeText xử lý đúng tiếng Việt có dấu. Logic AND giữa các bộ lọc (tìm kiếm, trạng thái, vị trí) hoạt động chính xác. Bulk actions gửi đúng danh sách ID được chọn và phản hồi đúng kết quả từ server.

3.1.20. KTT-020: Phân quyền Tạo và Chỉnh sửa Role Tài khoản theo Cấp bậc
Mục đích: Kiểm tra rằng Manager không thể tạo hoặc chỉnh sửa tài khoản với vai trò Director hoặc Admin, chỉ có Director hoặc Admin mới được phép thực hiện thao tác này — đảm bảo nguyên tắc phân quyền theo cấp bậc (Role-Based Privilege Escalation Prevention).
Điều kiện tiên quyết: Hệ thống đang chạy. Có sẵn tài khoản kiểm thử cho vai trò Manager, Director và Admin.
Các bước thực hiện:
1. Đăng nhập với tài khoản Manager, truy cập trang Quản lý nhân viên (`/employee`). Kết quả mong đợi là giao diện hiển thị form "Add Employee", dropdown Role chỉ có 2 lựa chọn: "Employee" và "Manager" — không xuất hiện "Director" hay "Admin".
2. Manager thử tạo tài khoản mới và chọn Role "Employee". Kết quả mong đợi là tạo thành công.
3. Manager thử gửi trực tiếp request POST tới `/employee/store` với dữ liệu `role=director` (bypass giao diện). Kết quả mong đợi là server trả về thông báo lỗi "You do not have permission to create accounts with Director or Admin role." và không tạo tài khoản.
4. Manager mở modal "Edit Employee" của một nhân viên hiện có. Kết quả mong đợi là dropdown Role trong form chỉnh sửa cũng chỉ hiển thị "Employee" và "Manager".
5. Đăng xuất, đăng nhập với tài khoản Director. Mở modal "Add Employee". Kết quả mong đợi là dropdown Role hiển thị đầy đủ 4 lựa chọn: Employee, Manager, Director, Admin.
6. Director tạo tài khoản mới với Role "Admin". Kết quả mong đợi là tài khoản được tạo thành công.
Tiêu chí đánh giá: Lớp kiểm soát phân quyền hoạt động ở cả hai tầng: giao diện (Frontend ẩn option không được phép) và logic nghiệp vụ tại server (Backend từ chối request không hợp lệ). Manager không thể leo thang đặc quyền (privilege escalation) dù cố tình bypass giao diện.

3.1.21. KTT-021: Kiểm soát Trạng thái Tài khoản (Ban/Unban) và Hiệu lực Truy cập
Mục đích: Xác minh chức năng khóa tài khoản (Ban) của Admin hoạt động chính xác, đảm bảo người dùng bị khóa không thể truy cập hệ thống ngay lập tức và có thể khôi phục quyền truy cập sau khi được mở khóa (Unban).
Điều kiện tiên quyết: Admin đang đăng nhập. Có một tài khoản nhân viên đang hoạt động bình thường để làm đối tượng kiểm thử.
Các bước thực hiện:
1. Admin truy cập trang Quản lý nhân viên, tìm nhân viên X và chọn "Ban User" từ menu hành động. Kết quả mong đợi: Hệ thống hiển thị nhãn "Banned" cạnh tên nhân viên và thông báo thành công.
2. Mở một trình duyệt khác (hoặc tab ẩn danh), thử đăng nhập bằng tài khoản nhân viên X vừa bị khóa. Kết quả mong đợi: Hệ thống từ chối đăng nhập và hiển thị thông báo "Tài khoản của bạn đã bị khóa".
3. Giả lập trường hợp nhân viên X đang có phiên đăng nhập hoạt động (đã login trước khi bị ban). Nhân viên X thực hiện một thao tác bất kỳ (như xem công việc). Kết quả mong đợi: Middleware `syncSessionUser` kiểm tra trạng thái trong DB, phát hiện tài khoản đã bị `isBanned`, tự động xóa session/cookie và đẩy người dùng ra trang login.
4. Admin quay lại danh sách nhân viên, chọn "Unban User" cho nhân viên X. Kết quả mong đợi: Nhãn "Banned" biến mất.
5. Nhân viên X thử đăng nhập lại. Kết quả mong đợi: Đăng nhập thành công và truy cập lại được toàn bộ chức năng theo quyền hạn cũ.
Tiêu chí đánh giá: Trạng thái khóa tài khoản có hiệu lực tức thì trên toàn hệ thống (cả lúc đăng nhập và các request đang thực hiện). Dữ liệu trạng thái `isBanned` được lưu trữ chính xác trong CSDL và phản ánh đúng lên giao diện quản lý.

3.1.22. KTT-022: Hiển thị Trang Hồ sơ Cá nhân (Profile Page)
Mục đích: Xác minh rằng trang hồ sơ cá nhân (`/auth`) hiển thị đầy đủ và chính xác thông tin người dùng đang đăng nhập, bao gồm ảnh đại diện, ảnh bìa, thông tin liên hệ, thống kê công việc tuần hiện tại.
Điều kiện tiên quyết: Người dùng đã đăng nhập thành công (bất kỳ vai trò nào: Employee, Manager, Director, Admin). Dữ liệu tài khoản đã có đầy đủ thông tin trong CSDL.
Các bước thực hiện:
1. Truy cập URL `/auth`. Kết quả mong đợi: Nếu chưa đăng nhập (token không hợp lệ hoặc không tồn tại), hệ thống redirect về `/login` và hiển thị flash message "Please sign in to continue."
2. Đăng nhập với tài khoản Employee (đã có đủ dữ liệu) rồi truy cập `/auth`. Kết quả mong đợi: Trang hồ sơ hiển thị đúng: ảnh đại diện (`user.avatar`), ảnh bìa (`user.cover`), tên đầy đủ (`user.name`), chức vụ + giờ làm tối đa (`user.position · user.maxtime`), trạng thái badge xanh (`user.trangthai`), email, số điện thoại, chi nhánh (`user.state`), ngày tham gia (`user.createdAt`), và phần "About" (`user.introduce`).
3. Kiểm tra phần thống kê công việc (STATS). Kết quả mong đợi: Ô "Tasks in progress" hiển thị đúng số task có trạng thái `working`, `checked_in`, hoặc `late`. Ô "Completed tasks" hiển thị đúng số task có trạng thái `completed`. Ô "Work hours this week" hiển thị tổng giờ ước tính của các task hoàn thành trong tuần hiện tại (từ Thứ Hai đến thời điểm hiện tại), đơn vị là giờ (vd: `12.5h`).
4. Kiểm tra với tài khoản có trường `avatar` và `cover` chưa được đặt (NULL hoặc rỗng). Kết quả mong đợi: Ảnh đại diện và ảnh bìa hiển thị ảnh mặc định (fallback), không bị vỡ layout hoặc lỗi broken image.
5. Kiểm tra với tài khoản không có bất kỳ task nào (`Distributions` rỗng). Kết quả mong đợi: Ba ô thống kê đều hiển thị giá trị `0` và `0h` — không có lỗi NaN hay crash.
Tiêu chí đánh giá: Dữ liệu hồ sơ phản ánh đúng thông tin trong CSDL tại thời điểm truy cập (không dùng cache cũ). Thống kê công việc tính toán đúng dựa trên logic `Distributions` và ngày giờ múi giờ thực tế. Trang không crash khi có trường dữ liệu thiếu hoặc rỗng.

3.1.23. KTT-023: Cập nhật Thông tin Hồ sơ Cá nhân (Edit Profile)
Mục đích: Kiểm tra luồng người dùng mở modal "Edit Profile", nhập và lưu thông tin cá nhân mới (Họ tên, Email, SĐT, Khu vực/Chi nhánh, Giới thiệu bản thân) thông qua route `POST /auth/update-profile`.
Điều kiện tiên quyết: Người dùng đã đăng nhập. Đang ở trang `/auth`.
Các bước thực hiện:
1. Nhấn vào nút ba chấm (⋮) góc phải thông tin hồ sơ, chọn "Edit profile". Kết quả mong đợi: Modal `#editProfileModal` xuất hiện với các trường đã điền sẵn thông tin hiện tại của người dùng (name, email, SDT, state, introduce).
2. Xóa trường "Họ và tên" (name) để trống và nhấn "Save changes". Kết quả mong đợi: Form không gửi đi (validation `required` phía client) hoặc server trả về lỗi Zod "Name must be at least 2 characters" và redirect về `/auth` với flash error.
3. Nhập tên có ít hơn 2 ký tự (vd: "A") và gửi. Kết quả mong đợi: Server validate thất bại, flash error "Name must be at least 2 characters."
4. Nhập email không hợp lệ (vd: "not-an-email") và gửi. Kết quả mong đợi: Server trả về lỗi validation email và redirect về `/auth` với flash error.
5. Nhập email hợp lệ nhưng đã thuộc về tài khoản khác trong hệ thống. Kết quả mong đợi: Server phát hiện trùng email (`emailExists`), trả về flash error "This email is already in use by another account." và không lưu thay đổi.
6. Điền đầy đủ tất cả các trường hợp lệ (tên: "Nguyễn Văn A", email mới hợp lệ, SĐT, state, introduce) và nhấn "Save changes". Kết quả mong đợi: Server lưu thành công, redirect về `/auth` với flash success "Profile updated successfully.", trang hồ sơ hiển thị thông tin mới.
7. Kiểm tra trường tùy chọn: Để trống `state` và `introduce`, gửi form. Kết quả mong đợi: Cập nhật thành công vì hai trường này là `optional()` trong schema Zod.
Tiêu chí đánh giá: Schema Zod (`name`, `email`, `SDT`, `state`, `introduce`) validate đúng ràng buộc. Kiểm tra email trùng lặp (`$ne: userId`) hoạt động chính xác. Thông tin được lưu vào CSDL qua `User.updateOne`. `syncSessionUser` middleware tự động refresh dữ liệu người dùng ở request tiếp theo.

3.1.24. KTT-024: Đổi Mật khẩu (Change Password)
Mục đích: Kiểm tra luồng đổi mật khẩu của người dùng thông qua route `POST /auth/change-password`, bao gồm xác thực mật khẩu hiện tại, kiểm tra xác nhận, và lưu hash mật khẩu mới.
Điều kiện tiên quyết: Người dùng đã đăng nhập. Đang ở trang `/auth`. Biết mật khẩu hiện tại của tài khoản.
Các bước thực hiện:
1. Nhấn nút ba chấm (⋮), chọn "Change password". Kết quả mong đợi: Modal `#changePasswordModal` xuất hiện với 3 trường nhập: "Current password", "New password", "Confirm new password" — tất cả đều ở dạng `type="password"`.
2. Để trống "Current password" và nhấn "Update". Kết quả mong đợi: Form không gửi (validation `required`) hoặc server trả về Zod error "Current password is required".
3. Nhập "New password" có ít hơn 6 ký tự (vd: "abc"). Kết quả mong đợi: Server hoặc HTML5 (`minlength="6"`) từ chối, flash error "New password must be at least 6 characters".
4. Nhập "New password" và "Confirm new password" không khớp nhau (vd: "newpass123" và "newpass456"). Kết quả mong đợi: Zod `refine` từ chối, flash error "Passwords don't match" và không thay đổi mật khẩu.
5. Nhập đúng định dạng nhưng "Current password" sai (không khớp với hash trong DB). Kết quả mong đợi: `bcrypt.compare` trả về false, flash error "Current password is incorrect.", redirect về `/auth`.
6. Nhập đúng "Current password", "New password" >= 6 ký tự, "Confirm new password" khớp "New password". Nhấn "Update". Kết quả mong đợi: Server hash mật khẩu mới bằng `bcrypt` (salt 10), lưu vào DB, redirect về `/auth` với flash success "Password changed successfully."
7. Sau khi đổi mật khẩu thành công, đăng xuất và thử đăng nhập lại bằng mật khẩu cũ. Kết quả mong đợi: Đăng nhập thất bại.
8. Đăng nhập lại bằng mật khẩu mới. Kết quả mong đợi: Đăng nhập thành công.
Tiêu chí đánh giá: `bcrypt.compare` xác thực đúng mật khẩu hiện tại. Hash mật khẩu mới (`bcrypt.hash` với cost 10) được lưu chính xác vào CSDL. Mật khẩu không bao giờ được lưu dạng plaintext. Toàn bộ ràng buộc Zod và `refine` hoạt động đúng.

    3.1.25. KTT-025: Upload Ảnh đại diện và Ảnh bìa (Image Upload)
    Mục đích: Kiểm tra chức năng upload và cập nhật ảnh đại diện (`avatar`) và ảnh bìa (`cover`) thông qua route `POST /auth/uploads-image-auth` (Multer + Sharp), bao gồm kiểm soát định dạng, dung lượng và xử lý chuyển đổi định dạng WebP.
    Điều kiện tiên quyết: Người dùng đã đăng nhập. Đang ở trang `/auth`. Chuẩn bị sẵn các file ảnh kiểm thử: ảnh hợp lệ `.jpg/.png/.webp` (< 5MB), file > 5MB, file `.exe` hoặc `.pdf`.
    Các bước thực hiện:
    1. Nhấn vào icon camera trên ảnh đại diện (`.avatar-edit`). Kết quả mong đợi: Modal `#imageModal` xuất hiện với tiêu đề "Update image", trường `#imageType` được set tự động là `"avatar"`, ô chọn file chấp nhận `.png, .jpg, .jpeg, .webp`.
    2. Nhấn vào nút "Change cover image" (`.cover-edit`). Kết quả mong đợi: Modal `#imageModal` xuất hiện, trường `#imageType` được set là `"cover"`.
    3. Trong modal, chọn một file ảnh hợp lệ (`.jpg`, < 5MB). Kết quả mong đợi: Ảnh preview xuất hiện ngay lập tức trong `#imagePreview` thông qua `FileReader` (client-side preview, không cần submit).
    4. Chọn file không đúng định dạng (vd: `.pdf`). Kết quả mong đợi: Trình duyệt lọc file qua thuộc tính `accept=".png,.jpg,.jpeg,.webp"` — file `.pdf` không xuất hiện trong hộp thoại chọn file. Nếu bypass qua DevTools, server detect MIME type thật bằng `file-type` library, trả về flash error "Invalid file. Only PNG, JPG, and WEBP are allowed." và redirect về `/auth`.
    5. Chọn file ảnh vượt quá 5MB (> 5 * 1024 * 1024 bytes). Kết quả mong đợi: Multer hoặc server logic phát hiện `req.file.size > MAX_UPLOAD_SIZE`, xóa file tạm, trả về flash error "File is too large (max 5MB)." và redirect về `/auth`.
    6. Gửi request `POST /auth/uploads-image-auth` mà không chọn file (req.file = null) hoặc với `type` không hợp lệ (không phải `avatar`/`cover`). Kết quả mong đợi: Server kiểm tra điều kiện `!['avatar', 'cover'].includes(type) || !req.file`, trả về flash error "Please select a valid image type to upload."
    7. Upload ảnh hợp lệ (`.jpg`, 2MB) làm ảnh đại diện. Kết quả mong đợi: Sharp resize ảnh về `300px` chiều rộng, chuyển đổi sang `.webp` (quality 85), lưu vào `src/public/uploads/avatar-<timestamp>.webp`. DB cập nhật trường `avatar` của user với đường dẫn `/uploads/avatar-<timestamp>.webp`. Trang `/auth` sau khi redirect hiển thị ảnh đại diện mới.
    8. Upload ảnh hợp lệ làm ảnh bìa. Kết quả mong đợi: Sharp resize về `1200px` chiều rộng, lưu dạng `.webp`. Ảnh bìa trên trang hồ sơ được cập nhật.
    9. Kiểm tra xem file tạm trong `uploads/` (thư mục dest của Multer) có bị xóa sau khi xử lý không. Kết quả mong đợi: File tạm được xóa bằng `fs.unlink` trong cả trường hợp thành công và thất bại.
    Tiêu chí đánh giá: Kiểm soát dung lượng và định dạng hoạt động ở cả hai tầng (Multer limits và `file-type` MIME detection). Sharp xử lý và nén ảnh đúng kích thước theo loại (`avatar`: 300px, `cover`: 1200px). Không để lại file rác trong thư mục `uploads/`. Đường dẫn ảnh được lưu chính xác vào CSDL và phản ánh ngay trên giao diện sau redirect.

