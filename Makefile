NAME = polonium
VERSION = 1.1.0

PKGFILE = $(NAME).kwinscript
PKGDIR = pkg

.NOTPARALLEL: all

all: build install cleanall

build: res src
	zip -r $(PKGFILE) $(PKGDIR)

$(PKGFILE): build

install:
	kpackagetool6 -t KWin/Script -s $(NAME) \
		&& kpackagetool6 -t KWin/Script -u $(PKGFILE) \
		|| kpackagetool6 -t KWin/Script -i $(PKGFILE)

clean: $(PKGDIR)
	rm -r $(PKGDIR)

cleanpkg: $(PKGFILE)
	rm $(PKGFILE)

cleanall: clean cleanpkg

start: stop
	dbus-send --session --dest=org.kde.KWin /Scripting org.kde.kwin.Scripting.loadScript string:'' string:'$(NAME)'

stop:
	dbus-send --session --dest=org.kde.KWin /Scripting org.kde.kwin.Scripting.unloadScript string:'$(NAME)'

lint:
	npx eslint "src/**"
	./scripts/sonarqube.sh

res: $(PKGDIR)
	cp -f res/metadata.json $(PKGDIR)/
	cp -f res/main.xml $(PKGDIR)/contents/config/
	cp -f res/config.ui $(PKGDIR)/contents/ui/
	cp -f res/main.js $(PKGDIR)/contents/code/
	sed -i "s/%VERSION%/$(VERSION)/" $(PKGDIR)/metadata.json
	sed -i "s/%NAME%/$(NAME)/" $(PKGDIR)/metadata.json

src: polonium.mjs $(PKGDIR)
	mv -f polonium.mjs $(PKGDIR)/contents/code/main.mjs
	cp -f src/qml/* $(PKGDIR)/contents/ui/

polonium.mjs:
	npm install
	npx esbuild --bundle src/index.ts --outfile=polonium.mjs --format=esm --platform=neutral

$(PKGDIR):
	mkdir -p $(PKGDIR)
	mkdir -p $(PKGDIR)/contents/code
	mkdir $(PKGDIR)/contents/config
	mkdir $(PKGDIR)/contents/ui

CARGO_HOME ?= $(HOME)/.cargo
XDG_CONFIG_HOME ?= $(HOME)/.config
XDG_DATA_HOME ?= $(HOME)/.local/share

dbus:
	cd dbus-saver && cargo install --path .
	install -m 644 -D -t $(XDG_CONFIG_HOME)/systemd/user dbus-saver/polonium-saver.service
	sed -i 's|^ExecStart=polonium-saver$$|ExecStart=$(CARGO_HOME)/bin/polonium-saver|' $(XDG_CONFIG_HOME)/systemd/user/polonium-saver.service
	install -m 644 -D -t $(XDG_DATA_HOME)/dbus-1/services dbus-saver/xyz.vaughanm.polonium.service
	sed -i 's|^Exec=polonium-saver$$|Exec=$(CARGO_HOME)/bin/polonium-saver|' $(XDG_DATA_HOME)/dbus-1/services/xyz.vaughanm.polonium.service
