import Swal from 'sweetalert2';

// Konfigurasi default tema SweetAlert2 yang selaras dengan tema aplikasi
export const CustomSwal = Swal.mixin({
  customClass: {
    popup: 'rounded-2xl border border-slate-200 shadow-xl font-sans text-slate-800',
    title: 'text-lg font-bold text-slate-800',
    htmlContainer: 'text-sm text-slate-600 leading-relaxed',
    confirmButton: 'px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition mx-1',
    cancelButton: 'px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition mx-1',
  },
  buttonsStyling: true,
  confirmButtonColor: '#0284c7', // Sky-600
  cancelButtonColor: '#64748b',  // Slate-500
});

// Toast kecil di pojok kanan atas untuk notifikasi cepat
export const showToast = (
  title: string, 
  icon: 'success' | 'error' | 'warning' | 'info' = 'success',
  timer = 3000
) => {
  return Swal.fire({
    toast: true,
    position: 'top-end',
    icon,
    title,
    showConfirmButton: false,
    timer,
    timerProgressBar: true,
    customClass: {
      popup: 'rounded-xl shadow-lg border border-slate-200',
    }
  });
};

// Alert Peringatan
export const showWarningAlert = (title: string, message: string) => {
  return CustomSwal.fire({
    icon: 'warning',
    title,
    html: message.replace(/\n/g, '<br/>'),
    confirmButtonText: 'Saya Mengerti',
    confirmButtonColor: '#f59e0b', // Amber-500
  });
};

// Alert Error
export const showErrorAlert = (title: string, message: string) => {
  return CustomSwal.fire({
    icon: 'error',
    title,
    html: message.replace(/\n/g, '<br/>'),
    confirmButtonText: 'Tutup',
    confirmButtonColor: '#e11d48', // Rose-600
  });
};

// Alert Sukses
export const showSuccessAlert = (title: string, message?: string) => {
  return CustomSwal.fire({
    icon: 'success',
    title,
    html: message ? message.replace(/\n/g, '<br/>') : undefined,
    confirmButtonText: 'OK',
    confirmButtonColor: '#0284c7', // Sky-600
  });
};

// Konfirmasi Aksi (misal Hapus Data)
export const showConfirmDialog = async (
  title: string,
  message: string,
  confirmButtonText = 'Ya, Lanjutkan',
  isDanger = false
): Promise<boolean> => {
  const result = await CustomSwal.fire({
    icon: isDanger ? 'warning' : 'question',
    title,
    html: message.replace(/\n/g, '<br/>'),
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText: 'Batal',
    confirmButtonColor: isDanger ? '#e11d48' : '#0284c7', // Rose-600 atau Sky-600
    cancelButtonColor: '#94a3b8',
    reverseButtons: true,
  });

  return result.isConfirmed;
};

export default CustomSwal;
