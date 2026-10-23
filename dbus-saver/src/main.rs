use std::{
    collections::HashMap,
    env,
    error::Error,
    fs::{self, File},
    io::{BufReader, BufWriter, Write},
    path::{Path, PathBuf},
    process::Command,
};

use dbus::blocking::Connection;
use dbus_crossroads::{Context, Crossroads};

fn get_file_path() -> PathBuf {
    let mut path = String::new();
    if let Ok(s) = env::var("XDG_CONFIG_HOME") {
        path.push_str(&s);
    } else {
        path.push_str(&env::var("HOME").unwrap());
        path.push_str("/.config");
    }
    path.push_str("/polonium.json");
    PathBuf::from(path)
}

type Settings = HashMap<String, String>;

fn read_settings(path: &Path) -> Settings {
    // in case of file not existing just return a blank hashmap
    let Ok(file) = File::open(path) else {
        return HashMap::new();
    };
    let reader = BufReader::new(file);
    match serde_json::from_reader(reader) {
        Ok(settings) => settings,
        Err(e) => {
            // a corrupt file shouldnt stop the saver from starting, so move it aside
            // (so it isnt lost) and start with blank settings
            let backup = path.with_extension("json.corrupt");
            eprintln!(
                "Polonium WRN - dbus - could not parse settings at {:?} ({}), moving it to {:?} and starting fresh",
                path, e, backup
            );
            if let Err(e) = fs::rename(path, &backup) {
                eprintln!("Polonium WRN - dbus - could not move corrupt settings: {}", e);
            }
            HashMap::new()
        }
    }
}

// write to a temporary file and rename it over the real one, so that a crash or
// full disk mid-write can never leave a truncated settings file behind
fn write_settings(settings: &Settings, path: &Path) -> Result<(), Box<dyn Error>> {
    let tmp_path = path.with_extension("json.tmp");
    let file = File::create(&tmp_path)?;
    let mut writer = BufWriter::new(file);
    serde_json::to_writer(&mut writer, settings)?;
    writer.flush()?;
    writer.get_ref().sync_all()?;
    fs::rename(&tmp_path, path)?;
    Ok(())
}

fn method_err(e: Box<dyn Error>) -> dbus::MethodErr {
    eprintln!("Polonium ERR - dbus - could not save settings: {}", e);
    dbus::MethodErr::failed(&format!("could not save settings: {}", e))
}

struct DBusObjects {
    file_path: PathBuf,
    settings: Settings,
}

fn main() -> Result<(), Box<dyn Error>> {
    if env::args().any(|arg| arg == "--clear-settings") {
        println!("Polonium LOG - clearing dbus settings");
        write_settings(&HashMap::new(), &get_file_path())?;
        println!("Polonium LOG - restarting dbus");
        Command::new("systemctl")
            .args(["--user", "restart", "polonium-saver"])
            .output()?;
        return Ok(());
    }
    let dbus_conn = Connection::new_session()?;
    dbus_conn.request_name("xyz.vaughanm.polonium", false, true, false)?;

    let mut dbus_cr = Crossroads::new();

    let saver_token = dbus_cr.register("xyz.vaughanm.polonium", |b| {
        b.method(
            "GetSettings",
            ("desktopId",),
            ("desktopId", "settingsBundle"),
            move |_ctx: &mut Context, objs: &mut DBusObjects, (desktop_id,): (String,)| {
                let settings_bundle = if let Some(reply) = objs.settings.get(&desktop_id) {
                    reply.clone()
                } else {
                    String::from("{}")
                };
                Ok((desktop_id, settings_bundle))
            },
        );
        b.method(
            "SetSettings",
            ("desktopId", "settingsBundle"),
            (),
            move |_ctx: &mut Context,
                  objs: &mut DBusObjects,
                  (desktop_id, settings_bundle): (String, String)| {
                objs.settings
                    .insert(desktop_id.clone(), settings_bundle.clone());
                write_settings(&objs.settings, &objs.file_path).map_err(method_err)
            },
        );
        b.method(
            "ResetSettings",
            ("desktopId",),
            (),
            move |_ctx: &mut Context, objs: &mut DBusObjects, (desktop_id,): (String,)| {
                objs.settings.remove(&desktop_id);
                write_settings(&objs.settings, &objs.file_path).map_err(method_err)
            },
        );
    });

    let file_path = get_file_path();
    println!("Polonium LOG - dbus - loading config at {:?}", &file_path);
    let dbus_objs = DBusObjects {
        settings: read_settings(&file_path),
        file_path: file_path,
    };

    dbus_cr.insert("/saver", &[saver_token], dbus_objs);

    dbus_cr.serve(&dbus_conn)?;
    unreachable!();
}
