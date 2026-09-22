UPDATE player_map_states
SET current_map_id = CASE current_map_id
    WHEN 'TRUC_LAM' THEN 'THANH_VAN_SON_MACH'
    WHEN 'LINH_KHE' THEN 'THANH_VAN_SON_MACH'
    WHEN 'HOA_DIEM_SON' THEN 'HUYEN_MOC_QUOC'
    WHEN 'THIEN_MON' THEN 'DONG_HOANG_DAI_LUC'
    ELSE current_map_id
END,
updated_at = CURRENT_TIMESTAMP
WHERE current_map_id IN ('TRUC_LAM', 'LINH_KHE', 'HOA_DIEM_SON', 'THIEN_MON');

-- Hai map Luyện Khí cũ được gộp thành map khởi đầu mới. Giữ audit row nhưng
-- xóa nguồn của movement bị co lại để không vi phạm ràng buộc from <> to.
UPDATE player_map_movements
SET from_map_id = NULL
WHERE from_map_id IN ('TRUC_LAM', 'LINH_KHE')
  AND to_map_id IN ('TRUC_LAM', 'LINH_KHE');

UPDATE player_map_movements
SET from_map_id = CASE from_map_id
        WHEN 'TRUC_LAM' THEN 'THANH_VAN_SON_MACH'
        WHEN 'LINH_KHE' THEN 'THANH_VAN_SON_MACH'
        WHEN 'HOA_DIEM_SON' THEN 'HUYEN_MOC_QUOC'
        WHEN 'THIEN_MON' THEN 'DONG_HOANG_DAI_LUC'
        ELSE from_map_id
    END,
    to_map_id = CASE to_map_id
        WHEN 'TRUC_LAM' THEN 'THANH_VAN_SON_MACH'
        WHEN 'LINH_KHE' THEN 'THANH_VAN_SON_MACH'
        WHEN 'HOA_DIEM_SON' THEN 'HUYEN_MOC_QUOC'
        WHEN 'THIEN_MON' THEN 'DONG_HOANG_DAI_LUC'
        ELSE to_map_id
    END
WHERE from_map_id IN ('TRUC_LAM', 'LINH_KHE', 'HOA_DIEM_SON', 'THIEN_MON')
   OR to_map_id IN ('TRUC_LAM', 'LINH_KHE', 'HOA_DIEM_SON', 'THIEN_MON');
