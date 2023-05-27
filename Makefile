NAME = polonium
VERSION = 0.1.0

PKGFILE = $(NAME).kwinscript
PKGDIR = pkg

all: build install

build: res src
	zip -r $(PKGFILE) $(PKGDIR)

install: $(PKGFILE)
	kpackagetool5 -t KWin/Script -s $(NAME) \
		&& kpackagetool5 -u $(PKGFILE) \
		|| kpackagetool5 -i $(PKGFILE)

clean: $(PKGDIR)
	rm -r $(PKGDIR)

cleanpkg: $(PKGFILE)
	rm $(PKGFILE)

cleanall: clean cleanpkg

res: $(PKGDIR)
	cp res/metadata.json $(PKGDIR)/
#	cp res/main.xml $(PKGDIR)/contents/config/
#	cp res/config.ui $(PKGDIR)/contents/ui/
	sed -i "s/%VERSION%/$(VERSION)/" $(PKGDIR)/metadata.json

src: $(PKGDIR)
	npm install
	tsc
	mv polonium.js pkg/contents/code/main.js

$(PKGDIR):
	mkdir -p $(PKGDIR)
	mkdir -p $(PKGDIR)/contents/code
	mkdir $(PKGDIR)/contents/config
	mkdir $(PKGDIR)/contents/ui
