# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[('fbclient.dll', '.')],
    datas=[('mock_response.py', '.'), ('empresa_info.py', '.'), ('empresa_manager.py', '.'), ('auth.py', '.'), ('conexao_firebird.py', '.'), ('config.py', '.'), ('database.py', '.'), ('models.py', '.'), ('relatorios.py', '.'), ('teste_empresa.py', '.'), ('teste_selecionar.py', '.'), ('teste_autenticacao.py', '.'), ('teste_cabecalhos.py', '.'), ('teste_conexao_api.py', '.'), ('teste_conexao_empresa.py', '.'), ('teste_conexao_empresa_v2.py', '.'), ('teste_conexao.py', '.'), ('teste_empresa_crud.py', '.'), ('teste_selecao_session.py', '.'), ('teste_session_simples.py', '.'), ('teste_sql_empresa.py', '.'), ('empresa_info_detalhada.py', '.')],
    hiddenimports=['jose', 'jose.jwt', 'fdb', 'passlib', 'passlib.context', 'passlib.handlers.bcrypt', 'pydantic_settings', 'sqlalchemy', 'sqlalchemy.ext.declarative'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='main',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
