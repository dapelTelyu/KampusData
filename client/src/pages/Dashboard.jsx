import { gql, useQuery, useMutation } from '@apollo/client';
import { studentClient, financeClient } from '../utils/apolloClients';
import { useNavigate } from 'react-router-dom';

const GET_PROFILE = gql`
  query GetProfile($nim: String!) {
    studentByNim(nim: $nim) {
      fullName
      major
      status
    }
  }
`;

const GET_FINANCE = gql`
  query GetStatus($nim: String!) {
    checkTuitionStatus(nim: $nim) {
      status
      amount
    }
  }
`;

const PAY_INVOICE = gql`
  mutation Pay($nim: String!, $amount: Float!) {
    createInvoice(nim: $nim, amount: $amount) {
      status
    }
  }
`;

export default function Dashboard() {
  const nim = localStorage.getItem('nim');
  const navigate = useNavigate();
  
  const { data: studentData, loading: sLoad } = useQuery(GET_PROFILE, {
    client: studentClient, variables: { nim }
  });

  const { data: financeData, loading: fLoad, refetch: refetchFinance } = useQuery(GET_FINANCE, {
    client: financeClient, variables: { nim }
  });

  const [payInvoice, { loading: pLoad }] = useMutation(PAY_INVOICE, {
    client: financeClient,
    onCompleted: () => {
      alert("Pembayaran Berhasil!");
      refetchFinance();
    }
  });

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  if (!nim) return <div className="flex h-screen items-center justify-center text-red-500">Akses Ditolak</div>;
  if (sLoad || fLoad) return <div className="flex h-screen items-center justify-center text-blue-500 animate-pulse">Memuat Data...</div>;

  const isPaid = financeData?.checkTuitionStatus?.status === 'PAID';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
            {studentData?.studentByNim?.fullName.charAt(0)}
          </div>
          <div>
            <h2 className="font-bold text-gray-800">{studentData?.studentByNim?.fullName}</h2>
            <p className="text-xs text-gray-500">{nim}</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="text-red-500 hover:text-red-700 font-medium text-sm transition"
        >
          Keluar
        </button>
      </nav>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Card Akademik */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">📂 Data Akademik</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Program Studi</span>
                <span className="font-medium text-gray-800">{studentData?.studentByNim?.major}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status Mahasiswa</span>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                  {studentData?.studentByNim?.status}
                </span>
              </div>
            </div>
          </div>

          {/* Card Keuangan */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">💰 Status Keuangan</h3>
            <div className="flex flex-col items-center justify-center py-4">
              <span className="text-gray-500 mb-2">Status Pembayaran SPP</span>
              <span className={`text-2xl font-bold ${isPaid ? 'text-green-600' : 'text-red-500'}`}>
                {financeData?.checkTuitionStatus?.status}
              </span>
              
              {!isPaid && (
                <button 
                  onClick={() => payInvoice({ variables: { nim, amount: 1500000 } })}
                  disabled={pLoad}
                  className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg shadow-lg transition w-full"
                >
                  {pLoad ? 'Memproses...' : 'Bayar Tagihan (Simulasi)'}
                </button>
              )}
            </div>
            {/* Dekorasi visual */}
            <div className={`absolute top-0 right-0 w-2 h-full ${isPaid ? 'bg-green-500' : 'bg-red-500'}`}></div>
          </div>
        </div>

        {/* Menu Actions */}
        <div className="mt-8 text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Layanan Tersedia</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <button 
                onClick={() => navigate('/sidang')}
                className="group p-6 bg-white border border-gray-200 rounded-xl hover:shadow-lg transition flex flex-col items-center gap-3 cursor-pointer"
             >
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-2xl group-hover:bg-blue-600 group-hover:text-white transition">
                  🎓
                </div>
                <span className="font-semibold text-gray-700">Daftar Sidang</span>
                <span className="text-xs text-gray-400">Syarat: Lunas & Bebas Pustaka</span>
             </button>
             
             {/* Tombol Dummy Lain */}
             <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl opacity-60 flex flex-col items-center gap-3 grayscale">
                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center text-2xl">📅</div>
                <span className="font-semibold text-gray-500">KRS Online (Coming Soon)</span>
             </div>
             <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl opacity-60 flex flex-col items-center gap-3 grayscale">
                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center text-2xl">📊</div>
                <span className="font-semibold text-gray-500">Lihat Nilai (Coming Soon)</span>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}