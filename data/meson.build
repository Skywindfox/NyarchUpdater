desktop = app_id + '.desktop'
desktop_config = configuration_data()
desktop_config.set('app-id', app_id)
desktop_file = i18n.merge_file(
    input: configure_file(
        input: desktop + '.in.in',
        output: desktop + '.in',
        configuration: desktop_config
    ),
    output: desktop,
    type: 'desktop',
    po_dir: '../po',
    install: true,
    install_dir: join_paths(datadir, 'applications')
)

desktop_utils = find_program('desktop-file-validate', required: false)
if desktop_utils.found()
  test('Validate desktop file', desktop_utils, args: [desktop_file])
endif

metainfo = app_id + '.metainfo.xml'
metainfo_config = configuration_data()
metainfo_config.set('app-id', app_id)
metainfo_config.set('release-version', meson.project_version())
appstream_file = i18n.merge_file(
        input: configure_file(
            input: metainfo + '.in.in',
            output: metainfo + '.in',
            configuration: metainfo_config
        ),
       output: metainfo,
       po_dir: '../po',
      install: true,
    install_dir: join_paths(get_option('datadir'), 'metainfo')
)

appstreamcli = find_program('appstreamcli', required: false, disabler: true)
test('Validate appstream file', appstreamcli,
     args: ['validate', '--no-net', '--explain', appstream_file])

install_data('moe.nyarchlinux.updater.gschema.xml',
  install_dir: join_paths(get_option('datadir'), 'glib-2.0', 'schemas')
)

compile_schemas = find_program('glib-compile-schemas', required: false, disabler: true)
test('Validate schema file',
     compile_schemas,
     args: ['--strict', '--dry-run', meson.current_source_dir()])

install_data('public.asc',
  install_dir: join_paths(get_option('datadir'), meson.project_name())
)

subdir('icons')