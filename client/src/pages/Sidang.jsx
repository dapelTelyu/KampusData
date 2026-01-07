import { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { academicClient } from '../utils/apolloClients';
import { useNavigate } from 'react-router-dom';

const REGISTER_SIDANG = gql`
  mutation DaftarSidang($title: String!) {
    registerSidang(title: $title) {
      nim
      status
      title
    }
  }
`;

export default function Sidang() {
  const [title, setTitle] = useState('');
  const navigate = useNavigate();

  const [register, { data, loading, error }] = useMutation(REGISTER_SIDANG, {
    client: academicClient,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register({ variables: { title } });
    } catch (err) { console.error(err); }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <button 
          onClick={() => navigate('/dashboard')}
          className="mb-6 flex items-center text-gray-500 hover:text-blue-600 transition"
        >
          ← Kembali ke Dashboard
        </button>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-blue-600 p-6 text-white">
            <h1 className="text-2xl font-bold">Pendaftaran Sidang Akhir</h1>
            <p className="opacity-90 text-sm mt-1">
              Sistem akan memvalidasi status <strong>Keuangan</strong> dan <strong>Perpustakaan</strong> secara otomatis.
            </p>
          </div>

          <div className="p-8">
            {!data ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Judul Skripsi / Tugas Akhir</label>
                  <textarea 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    rows="4" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="Masukkan judul lengkap skripsi Anda..."
                    required 
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={loading} 
                  className={`w-full py-3 rounded-lg font-bold text-white transition shadow-md flex justify-center items-center
                    ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Validasi Lintas Service...
                    </span>
                  ) : 'Ajukan Pendaftaran'}
                </button>
              </form>
            ) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                  ✅
                </div>
                <h3 className="text-2xl font-bold text-gray-800">Pendaftaran Berhasil!</h3>
                <div className="mt-4 bg-gray-50 p-4 rounded-lg text-left inline-block w-full border border-gray-200">
                  <p className="text-sm text-gray-500">NIM</p>
                  <p className="font-mono font-bold text-gray-800">{data.registerSidang.nim}</p>
                  <div className="h-2"></div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold">{data.registerSidang.status}</span>
                  <div className="h-2"></div>
                  <p className="text-sm text-gray-500">Judul</p>
                  <p className="text-gray-800">{data.registerSidang.title}</p>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm leading-5 font-medium text-red-800">
                      Gagal Mendaftar
                    </h3>
                    <div className="mt-2 text-sm leading-5 text-red-700">
                      {error.message}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}