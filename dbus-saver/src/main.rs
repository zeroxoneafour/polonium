use std::{collections::HashMap, env, error::Error, fs::File, io::{BufReader, BufWriter}, path::{Path, PathBuf}};

use dbus::blocking::Connection;
use dbus_crossroads::{Crossroads, Context};

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

fn read_settings(path: &Path) -> Result<Settings, Box<dyn Error>> {
    // in case of file not existing just return a blank hashmap
    let Ok(file) = File::open(path) else {
        return Ok(HashMap::new());
    };
    let reader = BufReader::new(file);
    let ret = serde_json::from_reader(reader)?;
    return Ok(ret);
}

fn write_settings(settings: &Settings, path: &Path) -> Result<(), Box<dyn Error>> {
    let file = File::create(path)?;
    let mut writer = BufWriter::new(file);
    serde_json::to_writer(&mut writer, settings)?;
    Ok(())
}

struct DBusObjects {
    file_path: PathBuf,
    settings: Settings,
}

fn main() -> Result<(), Box<dyn Error>> {    
    let dbus_conn = Connection::new_session()?;
    dbus_conn.request_name("xyz.vaughanm.polonium", false, true, false)?;
    
    let mut dbus_cr = Crossroads::new();

    let saver_token = dbus_cr.register("xyz.vaughanm.polonium", |b| {
        b.method("GetSettings", ("desktopId",), ("desktopId","settingsBundle",), move |_ctx: &mut Context, objs: &mut DBusObjects, (desktop_id,): (String,)| {
            let settings_bundle = if let Some(reply) = objs.settings.get(&desktop_id) {
                reply.clone()
            } else {
                String::from("{}")
            };
            Ok((desktop_id, settings_bundle,))
        });
        b.method("SetSettings", ("desktopId","settingsBundle",), (), move |_ctx: &mut Context, objs: &mut DBusObjects, (desktop_id, settings_bundle,): (String,String,)| {
            objs.settings.insert(desktop_id.clone(), settings_bundle.clone());
            write_settings(&objs.settings, &objs.file_path).unwrap();
            Ok(())
        });
        b.method("ResetSettings", ("desktopId",), (), move |_ctx: &mut Context, objs: &mut DBusObjects, (desktop_id,): (String,)| {
            objs.settings.remove(&desktop_id);
            write_settings(&objs.settings, &objs.file_path).unwrap();
            Ok(())
        });
    });

    let file_path = get_file_path();
    println!("Loading config at {:?}", &file_path);
    let dbus_objs = DBusObjects {
        settings: read_settings(&file_path)?,
        file_path: file_path,
    };

    dbus_cr.insert("/saver", &[saver_token], dbus_objs);

    dbus_cr.serve(&dbus_conn)?;
    unreachable!();
}
