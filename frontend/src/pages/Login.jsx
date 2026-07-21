import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, AlertCircle, Bus } from 'lucide-react';

const Login = () => {
  // Estados para guardar lo que el usuario escribe
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

  // Función que se ejecuta al presionar "Ingresar"
  const handleLogin = async (e) => {
    e.preventDefault(); // Evita que la página se recargue
    setError('');
    setIsLoading(true);

    try {
      // Hacemos la petición POST a tu servidor de Spring Boot
      const response = await axios.post('http://localhost:8080/api/auth/login', {
        username: username,
        password: password
      });

      // Si es exitoso, guardamos el Token JWT en la bóveda del navegador (localStorage)
      localStorage.setItem('token', response.data.token);
      
      // Y lo redirigimos al panel de control
      navigate('/dashboard');

    } catch (err) {
      console.error("Error en el login:", err);
      setError('Credenciales inválidas. Verifica tu usuario y contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {/* Tarjeta central del Login */}
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        
        {/* Encabezado con color corporativo */}
        <div className="bg-blue-600 p-8 text-center">
          <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
            <Bus className="text-white w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Red Alerta Rural</h2>
          <p className="text-blue-100 text-sm">Panel de Gestión Municipal</p>
        </div>

        {/* Formulario */}
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            
            {/* Mensaje de Error (solo aparece si hay error) */}
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* Campo Usuario */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuario Administrativo</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Ej: adminMuni"
                required
              />
            </div>

            {/* Campo Contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {/* Botón de Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
            >
              {isLoading ? (
                <span className="animate-pulse">Verificando credenciales...</span>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>Ingresar al Sistema</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;