// Sem janela de console no build de release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    xerifetv_lib::run()
}
