# Sintactico-1-2
Una vez obteniendo el resultado de Lexico, se deberá asignar un
token "numérico" a los componentes obtenidos, a continuación se expondrá
un ejemplo:

SELECT name,edad FROM tabla;

SELECT = > 333
name     = > 999
,              = > 23
edad      => 999
FROM    => 245
tabla      => 999
;              =>  12

Se utilizo el diccionario de tokens previante proporcionado por Pako con leves modificaciones, se guarndan los resultados en un archivo log que contienen el lexico separado con su respectivo token como el del ejemplo
