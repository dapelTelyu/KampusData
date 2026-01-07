import { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { authClient } from '../utils/apolloClients';
import { useNavigate } from 'react-router-dom';

const LOGIN_MUTATION = gql`
  mutation Login($nim: String!, $password: String!) {
    login(nim: $nim, password: $password) {
      token
      user { nim role }
    }
  }
`;

export default function Login() {
  const [nim, setNim] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const [login, { loading, error }] = useMutation(LOGIN_MUTATION, {
    client: authClient,
    onCompleted: (data) => {
      localStorage.setItem('token', data.login.token);
      localStorage.setItem('nim', data.login.user.nim);
      navigate('/dashboard');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    login({ variables: { nim, password } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md transform transition-all hover:scale-105 duration-300">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">AdaKampus</h1>
          <p className="text-gray-500 text-sm mt-2">Portal Akademik Terintegrasi</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">NIM</label>
            <input 
              type="text" 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="Contoh: 102022..."
              value={nim} 
              onChange={e => setNim(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="••••••••"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition duration-200 shadow-md disabled:bg-blue-300"
          >
            {loading ? 'Memproses...' : 'Masuk Portal'}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm text-center">
            {error.message}
          </div>
        )}
      </div>
    </div>
  );
}