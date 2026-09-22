# Gathering Resource Catalog Proposal

Module: Item / Gathering

Version: 0.1

Status: APPROVED — đã kích hoạt vào canonical GameData ngày 2026-07-27

---

## Contract đã duyệt

- Mỗi map/đại cảnh giới là một `resourceTier` độc lập từ 1 đến 15.
- Mỗi map có hai Linh Thảo và hai Linh Khoáng.
- Mỗi nhóm gồm một tài nguyên chính (weight 75, quantity 1–3) và một tài nguyên hiếm (weight 25, quantity 1).
- Linh Thảo mất 30 giây; Linh Khoáng mất 60 giây.
- Người chơi chỉ thu thập tài nguyên của map hiện tại.
- `resourceTier` mô tả cấp progression; `rarity` vẫn là độ hiếm Item và không thay thế tier.

## Quy ước ID đề xuất

- Linh Thảo: `HERB_<TEN_KHONG_DAU>`.
- Linh Khoáng: `ORE_<TEN_KHONG_DAU>`.
- ID là immutable content identity; tên hiển thị có thể chỉnh mà không migration.

## Catalog 15 map / 60 tài nguyên

| Tier | Map / Cảnh giới | Nhóm | Vai trò | ID đề xuất | Tên hiển thị | Mô tả/công dụng định hướng |
|---:|---|---|---|---|---|---|
| 1 | Thanh Vân Sơn Mạch / Luyện Khí | Thảo | Chính | `HERB_TU_LINH_THAO` | Tụ Linh Thảo | Tụ linh khí loãng, nguyên liệu nền cho đan dược Luyện Khí. |
| 1 | Thanh Vân Sơn Mạch / Luyện Khí | Thảo | Hiếm | `HERB_THANH_TAM_THAO` | Thanh Tâm Thảo | Thanh lọc tạp niệm, dùng cho đan ổn định tâm cảnh và đột phá nhập môn. |
| 1 | Thanh Vân Sơn Mạch / Luyện Khí | Khoáng | Chính | `ORE_THANH_LINH_THIET` | Thanh Linh Thiết | Linh thiết phổ thông để luyện pháp khí và khôi lỗi nhập môn. |
| 1 | Thanh Vân Sơn Mạch / Luyện Khí | Khoáng | Hiếm | `ORE_VAN_MAU_KHOANG` | Vân Mẫu Khoáng | Khoáng có vân linh khí, dùng làm lõi phù khí và trận bàn sơ cấp. |
| 2 | Huyền Mộc Quốc / Trúc Cơ | Thảo | Chính | `HERB_HUYEN_MOC_CHI` | Huyền Mộc Chi | Mộc chi giàu sinh cơ, nguyên liệu hồi phục và củng cố đạo cơ. |
| 2 | Huyền Mộc Quốc / Trúc Cơ | Thảo | Hiếm | `HERB_BICH_DIEP_LAN` | Bích Diệp Lan | Linh lan thanh khiết, dùng cho đan dược Trúc Cơ và giải độc. |
| 2 | Huyền Mộc Quốc / Trúc Cơ | Khoáng | Chính | `ORE_MOC_TAM_THACH` | Mộc Tâm Thạch | Khoáng cộng sinh cổ mộc, phù hợp pháp khí Mộc hệ. |
| 2 | Huyền Mộc Quốc / Trúc Cơ | Khoáng | Hiếm | `ORE_HUYEN_DONG` | Huyền Đồng Khoáng | Linh đồng bền dẻo, dùng luyện trận kỳ và linh kiện khôi lỗi. |
| 3 | Đông Hoang Đại Lục / Kết Đan | Thảo | Chính | `HERB_DIA_TAM_HOA_LIEN` | Địa Tâm Hỏa Liên | Hỏa liên từ địa mạch, dùng luyện đan tăng linh lực và tôi Kim Đan. |
| 3 | Đông Hoang Đại Lục / Kết Đan | Thảo | Hiếm | `HERB_KIM_SA_THAO` | Kim Sa Thảo | Lá phủ kim sa, hỗ trợ ổn định đan hỏa và cường hóa kinh mạch. |
| 3 | Đông Hoang Đại Lục / Kết Đan | Khoáng | Chính | `ORE_XICH_VIEM_THIET` | Xích Viêm Thiết | Linh thiết mang địa hỏa, nguyên liệu pháp bảo Kết Đan. |
| 3 | Đông Hoang Đại Lục / Kết Đan | Khoáng | Hiếm | `ORE_DONG_HOANG_TINH_SA` | Đông Hoang Tinh Sa | Tinh sa cô đọng, dùng khắc trận văn và tinh luyện pháp bảo. |
| 4 | Trung Châu Thánh Vực / Nguyên Anh | Thảo | Chính | `HERB_THANH_TAM_LIEN` | Thánh Tâm Liên | Linh liên ôn dưỡng thần hồn, dùng cho đan dược Nguyên Anh. |
| 4 | Trung Châu Thánh Vực / Nguyên Anh | Thảo | Hiếm | `HERB_NGUYEN_ANH_QUA` | Nguyên Anh Quả | Đạo quả hiếm bổ dưỡng nguyên thần và hồi phục căn nguyên. |
| 4 | Trung Châu Thánh Vực / Nguyên Anh | Khoáng | Chính | `ORE_TRUNG_CHAU_HUYEN_NGOC` | Trung Châu Huyền Ngọc | Huyền ngọc chứa linh vận, dùng cho pháp bảo thần hồn. |
| 4 | Trung Châu Thánh Vực / Nguyên Anh | Khoáng | Hiếm | `ORE_THANH_VAN_KIM` | Thánh Văn Kim | Thần kim tự sinh đạo văn, dùng cho trận bàn và pháp bảo cao cấp. |
| 5 | Thiên Linh Giới / Hóa Thần | Thảo | Chính | `HERB_THIEN_LINH_HOA` | Thiên Linh Hoa | Hấp thu linh quang thượng giới, hỗ trợ cô đọng thần niệm. |
| 5 | Thiên Linh Giới / Hóa Thần | Thảo | Hiếm | `HERB_HOA_THAN_THAO` | Hóa Thần Thảo | Linh thảo hiếm dùng cho đan dược chuyển hóa nguyên thần. |
| 5 | Thiên Linh Giới / Hóa Thần | Khoáng | Chính | `ORE_THIEN_LINH_TINH` | Thiên Linh Tinh | Linh tinh thuần khiết dùng luyện pháp bảo Hóa Thần. |
| 5 | Thiên Linh Giới / Hóa Thần | Khoáng | Hiếm | `ORE_HOA_THAN_NGOC` | Hóa Thần Ngọc | Thần ngọc dưỡng thần thức, thích hợp trận nhãn và khôi lỗi. |
| 6 | Hư Không Hải / Luyện Hư | Thảo | Chính | `HERB_HU_KHONG_DANG` | Hư Không Đằng | Linh đằng sinh trong khe không gian, dùng luyện đan Luyện Hư. |
| 6 | Hư Không Hải / Luyện Hư | Thảo | Hiếm | `HERB_KHONG_MINH_HOA` | Không Minh Hoa | Hoa ẩn hiện giữa hư không, hỗ trợ cảm ngộ không gian. |
| 6 | Hư Không Hải / Luyện Hư | Khoáng | Chính | `ORE_HU_KHONG_THACH` | Hư Không Thạch | Vật liệu chứa không gian ổn định cho túi trữ vật và trận pháp. |
| 6 | Hư Không Hải / Luyện Hư | Khoáng | Hiếm | `ORE_KHONG_MINH_TINH_THIET` | Không Minh Tinh Thiết | Tinh thiết xuyên hư không, dùng luyện pháp bảo không gian. |
| 7 | Thánh Linh Đại Lục / Hợp Thể | Thảo | Chính | `HERB_THANH_LINH_CHI` | Thánh Linh Chi | Linh chi dung hợp khí huyết và nguyên thần. |
| 7 | Thánh Linh Đại Lục / Hợp Thể | Thảo | Hiếm | `HERB_HOP_DAO_LIEN` | Hợp Đạo Liên | Đạo liên hỗ trợ thân–thần hợp nhất và ổn định pháp tướng. |
| 7 | Thánh Linh Đại Lục / Hợp Thể | Khoáng | Chính | `ORE_THANH_LINH_NGOC` | Thánh Linh Ngọc | Thánh ngọc tương hợp nhiều loại linh lực. |
| 7 | Thánh Linh Đại Lục / Hợp Thể | Khoáng | Hiếm | `ORE_HOP_THIEN_KIM` | Hợp Thiên Kim | Thần kim dung hợp vật liệu khác, dùng làm lõi pháp bảo Hợp Thể. |
| 8 | Cửu Thiên Tiên Cảnh / Đại Thừa | Thảo | Chính | `HERB_CUU_THIEN_TIEN_THAO` | Cửu Thiên Tiên Thảo | Tiên thảo thấm cửu thiên linh khí, nguyên liệu Đại Thừa. |
| 8 | Cửu Thiên Tiên Cảnh / Đại Thừa | Thảo | Hiếm | `HERB_DAI_THUA_DAO_QUA` | Đại Thừa Đạo Quả | Đạo quả trợ ngộ quy tắc và viên mãn tu vi Đại Thừa. |
| 8 | Cửu Thiên Tiên Cảnh / Đại Thừa | Khoáng | Chính | `ORE_CUU_THIEN_TIEN_KIM` | Cửu Thiên Tiên Kim | Tiên kim dùng luyện bán tiên khí và đại trận. |
| 8 | Cửu Thiên Tiên Cảnh / Đại Thừa | Khoáng | Hiếm | `ORE_DAI_THUA_NGOC_TUY` | Đại Thừa Ngọc Tủy | Ngọc tủy tinh thuần để nuôi dưỡng khí linh. |
| 9 | Thiên Kiếp Giới / Độ Kiếp | Thảo | Chính | `HERB_LOI_KIEP_HOA` | Lôi Kiếp Hoa | Linh hoa hấp thu kiếp lôi, dùng luyện đan kháng thiên kiếp. |
| 9 | Thiên Kiếp Giới / Độ Kiếp | Thảo | Hiếm | `HERB_DO_KIEP_TIEN_LIEN` | Độ Kiếp Tiên Liên | Tiên liên bảo hộ căn nguyên khi vượt kiếp. |
| 9 | Thiên Kiếp Giới / Độ Kiếp | Khoáng | Chính | `ORE_THIEN_LOI_THACH` | Thiên Lôi Thạch | Kiếp thạch tích lôi lực, dùng luyện pháp bảo Lôi hệ. |
| 9 | Thiên Kiếp Giới / Độ Kiếp | Khoáng | Hiếm | `ORE_KIEP_HOA_THAN_KIM` | Kiếp Hỏa Thần Kim | Thần kim qua kiếp hỏa tôi luyện, chịu được thiên uy. |
| 10 | Tiên Giới / Chân Tiên | Thảo | Chính | `HERB_CHAN_TIEN_THAO` | Chân Tiên Thảo | Tiên thảo cơ bản để luyện tiên đan Chân Tiên. |
| 10 | Tiên Giới / Chân Tiên | Thảo | Hiếm | `HERB_TIEN_NGUYEN_QUA` | Tiên Nguyên Quả | Tiên quả bổ sung tiên nguyên và chữa thương căn nguyên. |
| 10 | Tiên Giới / Chân Tiên | Khoáng | Chính | `ORE_TIEN_NGUYEN_NGOC` | Tiên Nguyên Ngọc | Tiên ngọc tích trữ tiên nguyên cho trận pháp và tiên khí. |
| 10 | Tiên Giới / Chân Tiên | Khoáng | Hiếm | `ORE_CHAN_TIEN_KIM` | Chân Tiên Kim | Tiên kim thuần khiết dùng luyện tiên khí nhập môn. |
| 11 | Huyền Thiên Tiên Vực / Huyền Tiên | Thảo | Chính | `HERB_HUYEN_THIEN_DAO_LIEN` | Huyền Thiên Đạo Liên | Đạo liên chứa huyền thiên pháp tắc. |
| 11 | Huyền Thiên Tiên Vực / Huyền Tiên | Thảo | Hiếm | `HERB_HUYEN_TIEN_LINH_CHI` | Huyền Tiên Linh Chi | Linh chi bồi bổ huyền tiên thể và thần hồn. |
| 11 | Huyền Thiên Tiên Vực / Huyền Tiên | Khoáng | Chính | `ORE_HUYEN_THIEN_TINH` | Huyền Thiên Tinh | Tinh thạch dùng bố trí huyền thiên tiên trận. |
| 11 | Huyền Thiên Tiên Vực / Huyền Tiên | Khoáng | Hiếm | `ORE_HUYEN_TIEN_BI_NGAN` | Huyền Tiên Bí Ngân | Bí ngân dẫn truyền pháp tắc, dùng cho tiên khí tinh vi. |
| 12 | Kim Khuyết Thiên / Kim Tiên | Thảo | Chính | `HERB_KIM_KHUYET_TIEN_LAN` | Kim Khuyết Tiên Lan | Tiên lan mang kim quang, dùng luyện Kim Tiên đan. |
| 12 | Kim Khuyết Thiên / Kim Tiên | Thảo | Hiếm | `HERB_KIM_TIEN_DAO_QUA` | Kim Tiên Đạo Quả | Đạo quả củng cố bất hủ kim thân. |
| 12 | Kim Khuyết Thiên / Kim Tiên | Khoáng | Chính | `ORE_KIM_KHUYET_THAN_KIM` | Kim Khuyết Thần Kim | Thần kim cứng chắc dùng luyện Kim Tiên khí. |
| 12 | Kim Khuyết Thiên / Kim Tiên | Khoáng | Hiếm | `ORE_THAI_DUONG_TIEN_TINH` | Thái Dương Tiên Tinh | Tiên tinh chứa dương lực, dùng làm lõi công phạt tiên khí. |
| 13 | Thái Sơ Giới / Thái Ất | Thảo | Chính | `HERB_THAI_SO_HON_NGUYEN_THAO` | Thái Sơ Hỗn Nguyên Thảo | Linh thảo mang hỗn nguyên khí sơ khai. |
| 13 | Thái Sơ Giới / Thái Ất | Thảo | Hiếm | `HERB_THAI_AT_DAO_LIEN` | Thái Ất Đạo Liên | Đạo liên trợ diễn hóa Thái Ất pháp tắc. |
| 13 | Thái Sơ Giới / Thái Ất | Khoáng | Chính | `ORE_THAI_SO_NGUYEN_THACH` | Thái Sơ Nguyên Thạch | Nguyên thạch chứa khí tức khai thiên. |
| 13 | Thái Sơ Giới / Thái Ất | Khoáng | Hiếm | `ORE_THAI_AT_TIEN_KIM` | Thái Ất Tiên Kim | Tiên kim dung nạp đa tầng pháp tắc. |
| 14 | Đại La Thiên / Đại La | Thảo | Chính | `HERB_DAI_LA_DAO_QUA` | Đại La Đạo Quả | Đạo quả giúp lĩnh ngộ vạn pháp quy nhất. |
| 14 | Đại La Thiên / Đại La | Thảo | Hiếm | `HERB_VAN_PHAP_TIEN_LIEN` | Vạn Pháp Tiên Liên | Tiên liên phản chiếu nhiều pháp tắc Đại La. |
| 14 | Đại La Thiên / Đại La | Khoáng | Chính | `ORE_DAI_LA_THAN_KIM` | Đại La Thần Kim | Thần kim dùng luyện Đại La đạo khí. |
| 14 | Đại La Thiên / Đại La | Khoáng | Hiếm | `ORE_VAN_PHAP_DAO_TINH` | Vạn Pháp Đạo Tinh | Đạo tinh khắc ghi pháp tắc, thích hợp làm trận nhãn. |
| 15 | Khởi Nguyên Đạo Giới / Đạo Tổ | Thảo | Chính | `HERB_KHOI_NGUYEN_DAO_LIEN` | Khởi Nguyên Đạo Liên | Đạo liên sinh từ nguyên khí khởi nguyên. |
| 15 | Khởi Nguyên Đạo Giới / Đạo Tổ | Thảo | Hiếm | `HERB_HONG_MONG_THAN_THAO` | Hồng Mông Thần Thảo | Thần thảo mang Hồng Mông khí, dùng cho đạo đan tối thượng. |
| 15 | Khởi Nguyên Đạo Giới / Đạo Tổ | Khoáng | Chính | `ORE_KHOI_NGUYEN_THAN_THACH` | Khởi Nguyên Thần Thạch | Thần thạch duy trì bản nguyên của đạo khí. |
| 15 | Khởi Nguyên Đạo Giới / Đạo Tổ | Khoáng | Hiếm | `ORE_HONG_MONG_DAO_KIM` | Hồng Mông Đạo Kim | Đạo kim tối thượng dùng luyện chí bảo cấp Đạo Tổ. |

## Trạng thái kích hoạt

Catalog đã được đưa vào:

- `gathering/resource_catalog.json`;
- canonical `itemTemplates` dưới dạng MATERIAL;
- 30 map gathering pool và Reward Table `WEIGHTED_ONE`;
- 30 Gathering Template tương ứng 15 map × 2 nhóm.

Theo `Q-PROFESSION-015`, Phá Chướng Đan dùng `Tụ Linh Thảo ×4 + Thanh Tâm Thảo ×1`.
Migration `026_gathering_resource_recipe_cutover.sql` chuyển inventory legacy `SPIRIT_HERB`
sang `HERB_TU_LINH_THAO` theo tỷ lệ 1:1; template cũ được giữ ở trạng thái deprecated
để duy trì khả năng đọc dữ liệu trong giai đoạn chuyển đổi.
