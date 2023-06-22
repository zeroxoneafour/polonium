NAME = polonium
VERSION = 0.5.1

PKGFILE = $(NAME).kwinscript
PKGDIR = pkg

.NOTPARALLEL: all

all: build install cleanall start

build: res src
	zip -r $(PKGFILE) $(PKGDIR)

install: $(PKGFILE)
	kpackagetool5 -t KWin/Script -s $(NAME) \
		&& kpackagetool5 -u $(PKGFILE) \
		|| kpackagetool5 -i $(PKGFILE)

clean: $(PKGDIR)
	$(foreach file, $(shell ls src/**/*.js), rm $(file);)
	$(foreach file, $(shell ls src/*.js), rm $(file);)
	rm -r $(PKGDIR)

cleanpkg: $(PKGFILE)
	rm $(PKGFILE)

cleanall: clean cleanpkg

start: stop
	dbus-send --session --dest=org.kde.KWin /Scripting org.kde.kwin.Scripting.loadScript string:'' string:'$(NAME)'

stop:
	dbus-send --session --dest=org.kde.KWin /Scripting org.kde.kwin.Scripting.unloadScript string:'$(NAME)'

res: $(PKGDIR)
	cp -f res/metadata.json $(PKGDIR)/
	cp -f res/main.xml $(PKGDIR)/contents/config/
	cp -f res/config.ui $(PKGDIR)/contents/ui/
	sed -i "s/%VERSION%/$(VERSION)/" $(PKGDIR)/metadata.json
	sed -i "s/%NAME%/$(NAME)/" $(PKGDIR)/metadata.json

src: $(PKGDIR)
	npm install
	tsc
	./node_modules/.bin/esbuild src/index.js --bundle --outfile=polonium.js
	mv -f polonium.js $(PKGDIR)/contents/code/main.js

$(PKGDIR):
	mkdir -p $(PKGDIR)
	mkdir -p $(PKGDIR)/contents/code
	mkdir $(PKGDIR)/contents/config
	mkdir $(PKGDIR)/contents/ui
