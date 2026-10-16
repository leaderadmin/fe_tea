<?php

use App\Http\Controllers\Auth\SessionController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->post('/login', [SessionController::class, 'store'])->middleware('throttle:5,1');
Route::middleware('auth')->post('/logout', [SessionController::class, 'destroy']);
