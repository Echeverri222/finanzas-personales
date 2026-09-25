# Patrimonio

## Cómo funciona?

La función de patrimonio puede ser activada o no por el usuario en cualquir momento, al momento de esta ser actida, se deb abrir la opción de crear cuentas. Las cuentas a creas son por ejemplo
 - Cuenta de ahorros: en caso de seleccionar este tipo se debe preguntar por el banco de esta.
 - Efectivo
 - Activo: puede ser cualquir tipo de activo, un carro, una casa, un apartamento, etc. Los activos deben tener asociado un valor total y valor en deuda (debe también poder activarse o no, ya que no siempre hay deuda sobre un activo)
 - Cuenta de inversiones, esto se referiría a un broker, entonces, puedo dentro del broker de igual manera tener efectivo (funsinoaría como una cuenta de ahorros en este caso) o puedo tener acciones (BTC, VOO, etc. En este caso, por medio de una API financiera, el valor total en pesos de la cuenta debe calcularse con base en la cantidad de acciones que tengo y el precio actual según el mercado, para estas acciones debo agregar un precio de compra por posición, ya que de la misma acción puedo tener muchas posiciones con diferentes precios de compra y de esta manera podré saber el rendimiento de las mismas en el patrimonio).

Toda esta funcionalidad de patrimonio no afectara el dashboard principal, el cual seguirá mostrando la misma información. Lo único que habilitará dentro de este, es que en caso de estar habilitado, tengo la opción de que mis gatos o ingresos se causen a una cuenta en específico. Por ejemplo, un pago de gasolina lo pago con mi cuenta de ahorros entonces lo marco para que afecte esta misma y se reduzca el valor de cash en la cuenta de ahorros. 

Entonces. Con base en la información anterior. Se deben crear modelos en la base de datos para las cuentas, para tener un snapshot del patrimonio total, relaciones para asociar transacciones a cuentas, modelos para las inversiones (posiciones) si estan abiertas o no, precio de compra, precio de venta, etc. Debe haber ademas una pantalla especifica para las inversiones, pueden ser de cuentas diferentes, donde se vea un historial de las rentabilidades de posiciones cerradas, precio de compra promedios por ticker y rentabilidades no ejecutadas, etc.
