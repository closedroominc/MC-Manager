import React from 'react';

// Sign-in is handled by Asmit Labs ID (Autentico); there is no password here.
const Login = () => (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-200 font-sans">
        <div className="w-full max-w-md p-8 bg-slate-900/50 border border-slate-800 rounded-xl shadow-2xl backdrop-blur-sm text-center">
            <img src="/closedroom-mark.svg" alt="Closed Room" className="w-16 h-16 mx-auto mb-4 rounded-2xl" />
            <h1 className="text-2xl font-bold text-white tracking-tight">CLOSED ROOM INC.</h1>
            <p className="text-slate-500 text-sm mt-2 uppercase tracking-widest">MC Server Manager</p>
            <p className="mt-8 text-sm text-slate-400">Sign-in is handled by Asmit Labs ID.</p>
            <a
                href="/auth/login"
                className="mt-6 w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-all duration-200 uppercase tracking-wide"
            >
                Sign in with Asmit Labs ID
            </a>
            <div className="mt-8 text-xs text-slate-600">
                <p>RESTRICTED ACCESS SYSTEM</p>
                <p>UNAUTHORIZED ACCESS IS PROHIBITED</p>
            </div>
        </div>
    </div>
);

export default Login;
